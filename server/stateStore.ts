/**
 * @fileoverview Lưu trữ state ứng dụng vào file JSON (server-side persistence).
 *
 * Dữ liệu được lưu tại data/app-state.json kế bên thư mục server/.
 * Khi sang ngày mới, points và lastCheckedDate bị xóa tự động.
 */

import fs from "fs";
import path from "path";
import type { PointsSummary } from "../src/logger";

export interface AppState {
    lastCheckedDate: string; // "Thu May 30 2026" format (Date.toDateString())
    points: Record<string, PointsSummary>;
}

const STATE_FILE = path.join(__dirname, "..", "data", "app-state.json");

function todayStr(): string {
    return new Date().toDateString();
}

function readFromDisk(): AppState {
    try {
        const raw = fs.readFileSync(STATE_FILE, "utf-8");
        const state = JSON.parse(raw) as AppState;
        // Sang ngày mới → reset điểm
        if (state.lastCheckedDate !== todayStr()) {
            return { lastCheckedDate: "", points: {} };
        }
        return state;
    } catch {
        return { lastCheckedDate: "", points: {} };
    }
}

function writeToDisk(state: AppState): void {
    try {
        fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
        console.error("stateStore: lỗi ghi file", err);
    }
}

// In-memory cache — đọc một lần khi server khởi động
let cache: AppState = readFromDisk();

export function getAppState(): AppState {
    return { lastCheckedDate: cache.lastCheckedDate, points: { ...cache.points } };
}

export function setLastCheckedDate(date: string): void {
    cache.lastCheckedDate = date;
    writeToDisk(cache);
}

export function updatePointsInState(profile: string, data: PointsSummary): void {
    cache.points[profile] = data;
    writeToDisk(cache);
}
