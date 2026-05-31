/**
 * @fileoverview Entry point của Web Server.
 *
 * - Tìm cổng khả dụng tự động (bắt đầu từ 3789)
 * - Serve static files từ web/dist/
 * - Mount REST API trên /api/*
 * - Setup WebSocket trên /ws
 *
 * Chạy: npx ts-node server/index.ts
 */

import express from "express";
import http from "http";
import path from "path";
import net from "net";
import { setupWebSocket } from "./ws";
import apiRoutes from "./routes";

const PREFERRED_PORT = 3789;
// Khi chạy trong Electron (packaged), main.ts truyền path chính xác qua APP_WEB_DIST.
// Khi chạy CLI (ts-node từ thư mục server/), __dirname = server/ nên path dưới vẫn đúng.
const WEB_DIST = process.env.APP_WEB_DIST ?? path.join(__dirname, "..", "web", "dist");

/** Tìm cổng trống bắt đầu từ preferred. */
function findFreePort(preferred: number): Promise<number> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(preferred, () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close(() => resolve(port));
        });
        server.on("error", () => resolve(findFreePort(preferred + 1)));
    });
}

async function main(): Promise<void> {
    // Khi chạy trong Electron, APP_SERVER_PORT được set cố định → dùng luôn, không cần findFreePort
    // Khi chạy CLI standalone → tìm cổng trống tự động
    const port = process.env.APP_SERVER_PORT ? Number(process.env.APP_SERVER_PORT) : await findFreePort(PREFERRED_PORT);

    const app = express();
    app.use(express.json());

    // Serve React build
    app.use(express.static(WEB_DIST));

    // REST API
    app.use("/api", apiRoutes);

    // SPA fallback — trả về index.html cho mọi route không phải /api
    app.get("/{*splat}", (_req, res) => {
        res.sendFile(path.join(WEB_DIST, "index.html"));
    });

    const server = http.createServer(app);
    setupWebSocket(server);

    server.listen(port, "127.0.0.1", () => {
        console.log(`\n🚀 Server đang chạy tại http://localhost:${port}`);
        console.log("   Mở trình duyệt để dùng Web UI.");
        console.log("   Nhấn Ctrl+C để dừng server.\n");
    });
}

main().catch((err) => {
    console.error("Lỗi khởi động server:", err);
    process.exit(1);
});
