/**
 * @fileoverview WebSocket server — broadcast log messages tới tất cả client đang kết nối.
 *
 * Mỗi khi src/logger.ts phát ra sự kiện 'message', module này relay tới browser.
 * Frontend nhận qua `new WebSocket('ws://localhost:<PORT>/ws')`.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { logEmitter } from "../src/logger";
import { updateProgress } from "./taskManager";
import { updatePointsInState } from "./stateStore";
import type { WsMessage, ProgressMessage, PointsMessage } from "../src/logger";

let wss: WebSocketServer;

function broadcast(data: WsMessage): void {
    if (!wss) return;
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

export function setupWebSocket(server: Server): void {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws) => {
        ws.send(JSON.stringify({ type: "log", message: "✅ Đã kết nối WebSocket", timestamp: Date.now() }));
    });

    // Relay mọi sự kiện log/progress/status tới tất cả client
    logEmitter.on("message", (msg: WsMessage) => {
        if (msg.type === "progress") {
            const p = msg as ProgressMessage;
            updateProgress(p.profile, p.done, p.total, p.phase);
        }
        if (msg.type === "points") {
            const p = msg as PointsMessage;
            updatePointsInState(p.profile, p.data);
        }
        broadcast(msg);
    });
}
