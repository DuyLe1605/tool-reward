/**
 * Zustand store — trạng thái toàn cục của ứng dụng.
 * Dùng persist để nhớ số lượt search mặc định giữa các lần mở.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface EdgeProfile {
    folder: string;
    name: string;
    email: string;
}

export interface ProfileProgress {
    done: number;
    total: number;
    desktopDone: number;
    desktopTotal: number;
    mobileDone: number;
    mobileTotal: number;
}

export interface PointsSummary {
    today: number;
    available: number;
    desktop: string;
    mobile: string;
    offers: number;
    lifetime: number;
    thisMonth: number;
    thisYear: number;
}

export interface TaskStatus {
    running: boolean;
    mode: "p" | "s";
    profiles: EdgeProfile[];
    progress: Record<string, ProfileProgress>;
    startedAt: number | null;
}

export type LogLevel = "info" | "error" | "success";

export interface LogLine {
    id: number;
    message: string;
    level: LogLevel;
    timestamp: number;
}

interface AppState {
    // Cài đặt người dùng (được persist)
    maxSearches: number;
    mobileSearches: number;
    searchType: "desktop" | "mobile" | "both";
    mode: "p" | "s";
    selectedIndices: number[];
    theme: "dark" | "light";
    setMaxSearches: (n: number) => void;
    setMobileSearches: (n: number) => void;
    setSearchType: (t: "desktop" | "mobile" | "both") => void;
    setMode: (m: "p" | "s") => void;
    setSelectedIndices: (indices: number[]) => void;
    setTheme: (t: "dark" | "light") => void;

    // Log console
    logs: LogLine[];
    appendLog: (message: string) => void;
    clearLogs: () => void;

    // Tiến độ realtime (từ WebSocket)
    progress: Record<string, ProfileProgress>;
    updateProgress: (profile: string, done: number, total: number, phase?: "desktop" | "mobile") => void;
    resetProgress: () => void;

    // Điểm thưởng (không persist — lấy từ server và cập nhật realtime qua WS)
    points: Record<string, PointsSummary>;
    updatePoints: (profile: string, data: PointsSummary) => void;
    setPoints: (all: Record<string, PointsSummary>) => void;

    // Ngày kiểm tra điểm gần nhất (không persist — lưu trên server)
    lastCheckedDate: string;
    setLastCheckedDate: (d: string) => void;

    // Trạng thái kết nối WS
    wsConnected: boolean;
    setWsConnected: (v: boolean) => void;
}

let logIdCounter = 0;

function detectLevel(msg: string): LogLevel {
    const lower = msg.toLowerCase();
    if (lower.includes("lỗi") || lower.includes("error") || lower.includes("nghiêm trọng")) return "error";
    if (lower.includes("hoàn thành") || lower.includes("✅") || lower.includes("<<<")) return "success";
    return "info";
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            maxSearches: 35,
            mobileSearches: 20,
            searchType: "both",
            mode: "s",
            theme: "dark",
            selectedIndices: [],
            setMaxSearches: (n) => set({ maxSearches: n }),
            setMobileSearches: (n) => set({ mobileSearches: n }),
            setSearchType: (t) => set({ searchType: t }),
            setMode: (m) => set({ mode: m }),
            setTheme: (t) => set({ theme: t }),
            setSelectedIndices: (indices) => set({ selectedIndices: indices }),

            logs: [],
            appendLog: (message) =>
                set((s) => ({
                    logs: [
                        ...s.logs.slice(-499), // giữ tối đa 500 dòng
                        { id: ++logIdCounter, message, level: detectLevel(message), timestamp: Date.now() },
                    ],
                })),
            clearLogs: () => set({ logs: [] }),

            progress: {},
            updateProgress: (profile, done, total, phase) =>
                set((s) => {
                    const cur = s.progress[profile] ?? {
                        done: 0,
                        total,
                        desktopDone: 0,
                        desktopTotal: 0,
                        mobileDone: 0,
                        mobileTotal: 0,
                    };
                    if (phase === "desktop") {
                        return {
                            progress: {
                                ...s.progress,
                                [profile]: {
                                    ...cur,
                                    desktopDone: done,
                                    desktopTotal: total,
                                    done: done + cur.mobileDone,
                                },
                            },
                        };
                    } else if (phase === "mobile") {
                        return {
                            progress: {
                                ...s.progress,
                                [profile]: {
                                    ...cur,
                                    mobileDone: done,
                                    mobileTotal: total,
                                    done: cur.desktopDone + done,
                                },
                            },
                        };
                    }
                    return { progress: { ...s.progress, [profile]: { ...cur, done, total } } };
                }),
            resetProgress: () => set({ progress: {} }),

            points: {},
            updatePoints: (profile, data) => set((s) => ({ points: { ...s.points, [profile]: data } })),
            setPoints: (all) => set({ points: all }),

            lastCheckedDate: "",
            setLastCheckedDate: (d) => set({ lastCheckedDate: d }),

            wsConnected: false,
            setWsConnected: (v) => set({ wsConnected: v }),
        }),
        {
            name: "reward-app-settings",
            partialize: (s) => ({
                maxSearches: s.maxSearches,
                mobileSearches: s.mobileSearches,
                searchType: s.searchType,
                mode: s.mode,
                theme: s.theme,
            }),
        },
    ),
);
