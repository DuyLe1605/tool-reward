/**
 * @fileoverview Đọc danh sách profile Edge từ hệ thống và phân tích lựa chọn.
 *
 * NẾU CẤU TRÚC FILE THAY ĐỔI (sau update Edge):
 *   Kiểm tra lại đường dẫn `data.profile.info_cache` trong file Local State.
 */

import fs from "fs";
import path from "path";
import { CONFIG } from "./config";

export interface EdgeProfile {
    folder: string;
    name: string;
    email: string;
}

/**
 * Đọc tất cả profile Edge từ file "Local State" của trình duyệt.
 * File nguồn: %LOCALAPPDATA%\Microsoft\Edge\User Data\Local State
 */
export function getEdgeProfiles(): EdgeProfile[] {
    const localStatePath = path.join(CONFIG.userDataDir, "Local State");
    const profiles: EdgeProfile[] = [];
    if (fs.existsSync(localStatePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
            const infoCache = data.profile.info_cache as Record<string, { name?: string; user_name?: string }>;
            for (const key in infoCache) {
                profiles.push({
                    folder: key,
                    name: infoCache[key].name ?? key,
                    email: infoCache[key].user_name ?? "No Email",
                });
            }
        } catch {
            // File lỗi hoặc không đọc được
        }
    }
    return profiles.length ? profiles : [{ folder: "Default", name: "Default", email: "Unknown" }];
}

/**
 * Phân tích chuỗi lựa chọn CLI thành mảng chỉ số 0-based.
 * Hỗ trợ: "all", "1,3", "1-3", "1,3-5"
 */
export function parseChoices(input: string, max: number): number[] {
    if (input.toLowerCase() === "all") {
        return Array.from({ length: max }, (_, i) => i);
    }
    const choices: number[] = [];
    const parts = input.split(/[, ]+/);
    for (const part of parts) {
        if (part.includes("-")) {
            const [startStr, endStr] = part.split("-");
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= max) choices.push(i - 1);
            }
        } else {
            const val = parseInt(part);
            if (val >= 1 && val <= max) choices.push(val - 1);
        }
    }
    return [...new Set(choices)].sort((a, b) => a - b);
}
