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
    | { type: "progress"; profile: string; done: number; total: number; timestamp: number }
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
                    if (msg.type === "log") appendLog(msg.message);
                    else if (msg.type === "progress") updateProgress(msg.profile, msg.done, msg.total);
                    else if (msg.type === "points") updatePoints(msg.profile, msg.data);
                    else if (msg.type === "status") {
                        if (!msg.running) resetProgress();
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
