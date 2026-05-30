/**
 * @fileoverview Quản lý task chạy nền — cho phép Web UI start/stop.
 *
 * Đây là cầu nối giữa HTTP API và các module search/rewards.
 * Dùng singleton để server có thể query trạng thái bất kỳ lúc nào.
 */

import { getEdgeProfiles, type EdgeProfile } from "../src/profiles";
import { performProfileTask } from "../src/search";
import { checkPointsForProfiles } from "../src/checkPoints";
import { taskController } from "../src/taskController";
import { emitStatus } from "../src/logger";

export type RunMode = "p" | "s";

export interface ProfileProgress {
    done: number;
    total: number;
}

export interface TaskStatus {
    running: boolean;
    mode: RunMode;
    profiles: EdgeProfile[];
    progress: Record<string, ProfileProgress>;
    startedAt: number | null;
}

const status: TaskStatus = {
    running: false,
    mode: "s",
    profiles: [],
    progress: {},
    startedAt: null,
};

export function getTaskStatus(): TaskStatus {
    return { ...status, progress: { ...status.progress } };
}

export function updateProgress(profileName: string, done: number, total: number): void {
    status.progress[profileName] = { done, total };
}

export async function startTask(profileIndices: number[], maxSearches: number, mode: RunMode): Promise<void> {
    if (status.running) throw new Error("Có task đang chạy");

    const allProfiles = getEdgeProfiles();
    const selected = profileIndices.map((i) => allProfiles[i]).filter(Boolean);
    if (selected.length === 0) throw new Error("Không có profile hợp lệ");

    status.running = true;
    status.mode = mode;
    status.profiles = selected;
    status.progress = {};
    status.startedAt = Date.now();
    selected.forEach((p) => {
        status.progress[p.name] = { done: 0, total: maxSearches };
    });

    taskController.reset();
    emitStatus(true);

    // Chạy async, không block HTTP response
    (async () => {
        try {
            if (mode === "p") {
                await Promise.all(selected.map((p) => performProfileTask(p, maxSearches, true)));
            } else {
                for (const p of selected) {
                    if (taskController.shouldStop) break;
                    await performProfileTask(p, maxSearches, false);
                }
            }
        } finally {
            status.running = false;
            status.startedAt = null;
            status.profiles = [];
            status.progress = {};
            taskController.done();
            emitStatus(false);
        }
    })();
}

export function stopTask(): void {
    taskController.stop();
}

export async function startCheckPoints(profileIndices: number[]): Promise<void> {
    if (status.running) throw new Error("Có task đang chạy");

    const allProfiles = getEdgeProfiles();
    const selected = profileIndices.map((i) => allProfiles[i]).filter(Boolean);
    if (selected.length === 0) throw new Error("Không có profile hợp lệ");

    status.running = true;
    status.mode = "s";
    status.profiles = selected;
    status.progress = {};
    status.startedAt = Date.now();
    taskController.reset();
    emitStatus(true);

    (async () => {
        try {
            await checkPointsForProfiles(selected);
        } finally {
            status.running = false;
            status.startedAt = null;
            status.profiles = [];
            status.progress = {};
            taskController.done();
            emitStatus(false);
        }
    })();
}
