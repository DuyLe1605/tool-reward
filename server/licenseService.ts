/**
 * @fileoverview Quản lý xác thực bản quyền, Hardware ID và trừ lượt runs trên Supabase.
 */

import child_process from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kcbhuprbaenskzrfdpzx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_JuIttPzoh1kbAYQJ72UVSA_fN6DrJ_j";

// Lưu file license.json ở cùng thư mục dữ liệu với app-state.json
const DATA_DIR = process.env.APP_DATA_DIR ?? path.join(__dirname, "..", "data");
const LICENSE_FILE = path.join(DATA_DIR, "license.json");

export interface LicenseInfo {
    valid: boolean;
    error?: string;
    key_code?: string;
    customer_name?: string;
    max_profiles?: number;
    total_runs?: number;
    used_runs?: number;
    remaining_runs?: number;
    expires_at?: string;
    activated_at?: string;
}

export interface LicenseStatusResponse {
    machineId: string;
    key: string | null;
    license: LicenseInfo | null;
}

let cachedMachineId: string | null = null;

/**
 * Lấy Hardware ID (MachineGuid) trên Windows.
 * Sử dụng Registry chuẩn của Windows: HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid
 */
export function getMachineId(): string {
    if (cachedMachineId) return cachedMachineId;

    try {
        const out = child_process.execSync(
            'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
            { encoding: "utf8", windowsHide: true }
        );
        const match = out.match(/REG_SZ\s+([a-f0-9-]+)/i);
        if (match && match[1]) {
            cachedMachineId = match[1].trim();
            return cachedMachineId;
        }
    } catch {
        // Fallback nếu không đọc được registry
    }

    cachedMachineId = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return cachedMachineId;
}

/** Đọc key lưu trên máy */
export function getSavedKey(): string | null {
    try {
        if (fs.existsSync(LICENSE_FILE)) {
            const raw = fs.readFileSync(LICENSE_FILE, "utf-8");
            const data = JSON.parse(raw);
            return typeof data.key === "string" ? data.key.trim() : null;
        }
    } catch {
        // ignore
    }
    return null;
}

/** Lưu key vào máy (ghi đè key cũ) */
export function saveKey(key: string): void {
    try {
        fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
        fs.writeFileSync(LICENSE_FILE, JSON.stringify({ key: key.trim(), updatedAt: new Date().toISOString() }, null, 2), "utf-8");
    } catch (err) {
        console.error("licenseService: lỗi ghi file license", err);
    }
}

/** Xóa key trên máy */
export function clearKey(): void {
    try {
        if (fs.existsSync(LICENSE_FILE)) {
            fs.unlinkSync(LICENSE_FILE);
        }
    } catch {
        // ignore
    }
}

/** Gọi RPC check_or_activate_license trên Supabase */
async function callCheckOrActivate(keyCode: string, machineId: string): Promise<LicenseInfo> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_or_activate_license`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            p_key_code: keyCode,
            p_machine_id: machineId,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi kết nối máy chủ xác thực (${res.status}): ${errText}`);
    }

    return (await res.json()) as LicenseInfo;
}

/** Lấy trạng thái bản quyền hiện tại */
export async function getLicenseStatus(): Promise<LicenseStatusResponse> {
    const machineId = getMachineId();
    const key = getSavedKey();

    if (!key) {
        return {
            machineId,
            key: null,
            license: {
                valid: false,
                error: "Chưa kích hoạt bản quyền. Vui lòng nhập mã key!",
            },
        };
    }

    try {
        const info = await callCheckOrActivate(key, machineId);
        return {
            machineId,
            key,
            license: info,
        };
    } catch (err) {
        return {
            machineId,
            key,
            license: {
                valid: false,
                error: (err as Error).message || "Không thể kiểm tra bản quyền",
            },
        };
    }
}

/** Kích hoạt key mới (thay thế key cũ) */
export async function activateLicense(newKey: string): Promise<LicenseInfo> {
    const machineId = getMachineId();
    const cleanedKey = newKey.trim();

    if (!cleanedKey) {
        throw new Error("Vui lòng nhập mã key hợp lệ");
    }

    const info = await callCheckOrActivate(cleanedKey, machineId);
    if (!info.valid) {
        throw new Error(info.error || "Mã bản quyền không hợp lệ");
    }

    // Hợp lệ -> Lưu đè lên máy
    saveKey(cleanedKey);
    return info;
}

/**
 * Trừ số lượt runs khi bắt đầu chạy task.
 * Atomic RPC trên Supabase: Trừ runs ngay khi bấm chạy.
 */
export async function consumeRuns(runsCount: number): Promise<{ success: boolean; remaining_runs: number }> {
    const machineId = getMachineId();
    const key = getSavedKey();

    if (!key) {
        throw new Error("Chưa nhập mã bản quyền! Vui lòng kích hoạt key để sử dụng.");
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_license_runs`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            p_key_code: key,
            p_machine_id: machineId,
            p_runs_count: runsCount,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi trừ lượt chạy (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { success: boolean; error?: string; remaining_runs: number; used_runs: number };
    if (!data.success) {
        throw new Error(data.error || "Không thể trừ lượt chạy");
    }

    return {
        success: true,
        remaining_runs: data.remaining_runs,
    };
}
