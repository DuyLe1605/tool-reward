/**
 * @fileoverview Logger trung tâm — ghi ra stdout VÀ phát sự kiện cho WebSocket server.
 *
 * - Chế độ CLI: chỉ ghi stdout (giống console.log)
 * - Chế độ Web Server: ghi stdout + emit event → WebSocket server broadcast tới browser
 *
 * Tất cả module trong src/ dùng `log()` thay cho `console.log()` để server mode
 * có thể stream log ra trình duyệt real-time qua WebSocket.
 */

import { EventEmitter } from "events";

export interface LogMessage {
    type: "log";
    message: string;
    timestamp: number;
}

export interface ProgressMessage {
    type: "progress";
    profile: string;
    done: number;
    total: number;
    timestamp: number;
}

export interface StatusMessage {
    type: "status";
    running: boolean;
    timestamp: number;
}

export interface PointsSummary {
    today: number;
    desktop: string; // e.g. "9/90"
    mobile: string; // e.g. "0/60"
    offers: number;
    lifetime: number;
    thisMonth: number;
    thisYear: number;
}

export interface PointsMessage {
    type: "points";
    profile: string;
    data: PointsSummary;
    timestamp: number;
}

export type WsMessage = LogMessage | ProgressMessage | StatusMessage | PointsMessage;

export const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(50);

/** Ghi log — xuất ra stdout và phát sự kiện để WebSocket server relay tới trình duyệt. */
export function log(message: string): void {
    process.stdout.write(message + "\n");
    logEmitter.emit("message", { type: "log", message, timestamp: Date.now() } satisfies LogMessage);
}

/** Phát cập nhật tiến độ tìm kiếm cho một profile cụ thể. */
export function emitProgress(profile: string, done: number, total: number): void {
    logEmitter.emit("message", {
        type: "progress",
        profile,
        done,
        total,
        timestamp: Date.now(),
    } satisfies ProgressMessage);
}

/** Phát trạng thái running/stopped của task tổng thể. */
export function emitStatus(running: boolean): void {
    logEmitter.emit("message", { type: "status", running, timestamp: Date.now() } satisfies StatusMessage);
}

/** Phát dữ liệu điểm thưởng của một profile sau khi scrape từ trang Rewards. */
export function emitPoints(profile: string, data: PointsSummary): void {
    logEmitter.emit("message", { type: "points", profile, data, timestamp: Date.now() } satisfies PointsMessage);
}
