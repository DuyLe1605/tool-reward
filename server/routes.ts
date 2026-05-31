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
import { getEdgeProfiles } from "../src/profiles";
import { getTaskStatus, startTask, stopTask, startCheckPoints } from "./taskManager";
import { getAppState, setLastCheckedDate } from "./stateStore";

const router = Router();

// ── Health check — dùng bởi Electron main để phát hiện khi server sẵn sàng ──
router.get("/status", (_req, res) => {
    res.json({ ok: true });
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
