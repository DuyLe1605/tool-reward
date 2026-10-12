/**
 * @fileoverview REST API routes cho Web UI.
 *
 * GET  /api/status          — Health check (dùng bởi Electron waitForServer)
 * GET  /api/profiles        — Danh sách profile Edge
 * GET  /api/tasks/status    — Trạng thái task hiện tại
 * POST /api/tasks/start     — Bắt đầu task { profileIndices, maxSearches, mode }
 * POST /api/tasks/stop      — Dừng task đang chạy
 */

import { Router } from "express";
import path from "path";
import fs from "fs";
import { getEdgeProfiles } from "../src/profiles";
import { getTaskStatus, startTask, stopTask, startCheckPoints } from "./taskManager";
import { getAppState, setLastCheckedDate } from "./stateStore";
import { getLicenseStatus, activateLicense, consumeRuns } from "./licenseService";

const router = Router();

function getVersion(): string {
    try {
        let pkgPath = path.join(__dirname, "..", "package.json");
        if (fs.existsSync(pkgPath)) {
            return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || "9.0.7";
        }
        pkgPath = path.join(__dirname, "..", "..", "package.json");
        if (fs.existsSync(pkgPath)) {
            return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || "9.0.7";
        }
    } catch {
        // ignore
    }
    return "9.0.7";
}

// ── Health check — dùng bởi Electron main để phát hiện khi server sẵn sàng ──
router.get("/status", (_req, res) => {
    res.json({ ok: true, version: getVersion() });
});

// ── Quản lý Bản quyền (License) ──
router.get("/license", async (_req, res) => {
    try {
        const status = await getLicenseStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

router.post("/license/activate", async (req, res) => {
    const { key } = req.body as { key?: string };
    if (!key || typeof key !== "string" || !key.trim()) {
        res.status(400).json({ error: "Vui lòng nhập mã key hợp lệ" });
        return;
    }
    try {
        const info = await activateLicense(key.trim());
        res.json({ ok: true, license: info });
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

router.get("/profiles", (_req, res) => {
    res.json(getEdgeProfiles());
});

router.get("/tasks/status", (_req, res) => {
    res.json(getTaskStatus());
});

router.post("/tasks/start", async (req, res) => {
    const { profileIndices, maxSearches, mobileSearches, mode, searchType } = req.body as {
        profileIndices: number[];
        maxSearches: number;
        mobileSearches: number;
        mode: "p" | "s";
        searchType: "desktop" | "mobile" | "both";
    };

    if (!Array.isArray(profileIndices) || profileIndices.length === 0) {
        res.status(400).json({ error: "profileIndices là bắt buộc" });
        return;
    }

    try {
        // 1. Kiểm tra bản quyền trước
        const licenseStatus = await getLicenseStatus();
        if (!licenseStatus.license || !licenseStatus.license.valid) {
            res.status(403).json({ 
                error: licenseStatus.license?.error || "Chưa kích hoạt bản quyền hợp lệ! Vui lòng nhập Key ở góc trên." 
            });
            return;
        }

        // 2. Kiểm tra số lượng profile có vượt quá max_profiles không
        const maxProfiles = licenseStatus.license.max_profiles ?? 5;
        if (profileIndices.length > maxProfiles) {
            res.status(400).json({
                error: `Gói bản quyền của bạn chỉ cho phép tối đa ${maxProfiles} profile. Bạn đang chọn ${profileIndices.length} profile!`
            });
            return;
        }

        // 3. Trừ số lượt runs ngay lập tức (1 profile chạy = 1 run)
        await consumeRuns(profileIndices.length);

        // 4. Khởi chạy task
        await startTask(profileIndices, maxSearches ?? 35, mobileSearches ?? 20, mode ?? "s", searchType ?? "both");
        res.json({ ok: true });
    } catch (err) {
        res.status(409).json({ error: (err as Error).message });
    }
});

router.post("/tasks/stop", (_req, res) => {
    stopTask();
    res.json({ ok: true });
});

router.post("/tasks/check-points", async (req, res) => {
    const { profileIndices } = req.body as { profileIndices: number[] };
    if (!Array.isArray(profileIndices) || profileIndices.length === 0) {
        res.status(400).json({ error: "profileIndices là bắt buộc" });
        return;
    }
    try {
        await startCheckPoints(profileIndices);
        res.json({ ok: true });
    } catch (err) {
        res.status(409).json({ error: (err as Error).message });
    }
});

// ── App state (server-side persistence) ────────────────────────────────────────
router.get("/app-state", (_req, res) => {
    res.json(getAppState());
});

router.post("/app-state/checked", (_req, res) => {
    setLastCheckedDate(new Date().toDateString());
    res.json({ ok: true });
});

router.post("/shutdown", (_req, res) => {
    res.json({ ok: true });
    setTimeout(() => process.exit(0), 200);
});

export default router;
