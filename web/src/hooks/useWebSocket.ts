/**
 * Hook kết nối WebSocket tới backend.
 * Nhận log/progress/status realtime và cập nhật Zustand store.
 *
 * WebSocket endpoint: ws://localhost:<port>/ws
 * Tự động reconnect khi mất kết nối.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import type { PointsSummary } from "@/store/useAppStore";

type WsMsg =
    | { type: "log"; message: string; timestamp: number }
    | {
          type: "progress";
          profile: string;
          done: number;
          total: number;
          phase?: "desktop" | "mobile";
          timestamp: number;
      }
    | { type: "status"; running: boolean; timestamp: number }
    | { type: "points"; profile: string; data: PointsSummary; timestamp: number };

export function useWebSocket() {
    const appendLog = useAppStore((s) => s.appendLog);
    const updateProgress = useAppStore((s) => s.updateProgress);
    const resetProgress = useAppStore((s) => s.resetProgress);
    const setWsConnected = useAppStore((s) => s.setWsConnected);
    const updatePoints = useAppStore((s) => s.updatePoints);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track điểm hôm nay của từng profile trong session hiện tại — dùng cho notification
    const sessionPointsRef = useRef<Record<string, number>>({});

    const queryClient = useQueryClient();

    useEffect(() => {
        function connect() {
            const proto = window.location.protocol === "https:" ? "wss" : "ws";
            const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
            wsRef.current = ws;

            ws.onopen = () => setWsConnected(true);

            ws.onmessage = (event) => {
                try {
                    const msg: WsMsg = JSON.parse(event.data as string);
                    if (msg.type === "log") {
                        appendLog(msg.message);
                    } else if (msg.type === "progress") {
                        updateProgress(msg.profile, msg.done, msg.total, msg.phase);
                    } else if (msg.type === "points") {
                        updatePoints(msg.profile, msg.data);
                        sessionPointsRef.current[msg.profile] = msg.data.today;
                    } else if (msg.type === "status") {
                        if (msg.running) {
                            // Reset accumulator khi bắt đầu task mới
                            sessionPointsRef.current = {};
                        } else {
                            resetProgress();
                            // Gửi notification qua Electron IPC nếu đang chạy trong app
                            const api = (
                                window as {
                                    electronAPI?: {
                                        notifyTaskDone?: (c: number, t: number) => Promise<void>;
                                    };
                                }
                            ).electronAPI;
                            if (api?.notifyTaskDone) {
                                const pts = sessionPointsRef.current;
                                const profileCount = Object.keys(pts).length;
                                const totalPoints = Object.values(pts).reduce((s, v) => s + v, 0);
                                if (profileCount > 0) {
                                    void api.notifyTaskDone(profileCount, totalPoints);
                                }
                            }
                        }
                        queryClient.invalidateQueries({ queryKey: ["status"] });
                    }
                } catch {
                    /* invalid message */
                }
            };

            ws.onclose = () => {
                setWsConnected(false);
                reconnectTimer.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => ws.close();
        }

        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [appendLog, updateProgress, resetProgress, setWsConnected, updatePoints, queryClient]);
}
