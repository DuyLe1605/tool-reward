/**
 * @fileoverview Electron main process — entry point của desktop app.
 *
 * LUỒNG KHỞI ĐỘNG:
 *   1. Set các env vars cần thiết (APP_DATA_DIR, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD)
 *   2. Import và khởi động Express server (cùng process — không spawn child)
 *   3. Poll /api/status cho đến khi server sẵn sàng
 *   4. Tạo BrowserWindow và load http://127.0.0.1:3789
 *   5. Setup auto-updater (chỉ khi đã đóng gói / app.isPackaged = true)
 *
 * AUTO-UPDATE:
 *   - Dùng electron-updater + GitHub Releases (provider: github)
 *   - Khi bạn push tag v* lên GitHub, Actions sẽ build và publish Release mới
 *   - App sẽ tự phát hiện và tải bản mới trong nền, nhắc user khởi động lại
 *
 * DATA PATH:
 *   - Process.env.APP_DATA_DIR được set trước khi import server, nên
 *     server/stateStore.ts sẽ lưu app-state.json vào đây thay vì trong asar
 *   - Windows: %APPDATA%\Rewards Tool\
 *
 * PLAYWRIGHT:
 *   - App dùng channel: "msedge" → playwright tìm Edge đã cài trên máy
 *   - Không cần bundle browser binary vào installer
 */

import { app, BrowserWindow, shell, dialog, nativeImage } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import path from "path";
import http from "http";

// ── Bật logging vào file (thay console.log trong packaged app) ────────────
log.transports.file.level = "info";
autoUpdater.logger = log;

// ── Bỏ qua download playwright browsers — app dùng system Edge ───────────
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

const SERVER_PORT = 3789;
let mainWindow: BrowserWindow | null = null;

// ── Khởi động Express server ──────────────────────────────────────────────
async function startServer(): Promise<void> {
    // Đặt data dir TRƯỚC KHI import server, để stateStore.ts nhận đúng path
    process.env.APP_DATA_DIR = app.getPath("userData");
    log.info(`[main] APP_DATA_DIR = ${process.env.APP_DATA_DIR}`);

    if (app.isPackaged) {
        // Packaged: server đã được compile sang JS, nằm trong resources/app/dist/
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require(path.join(app.getAppPath(), "dist", "server", "index.js"));
    } else {
        // Dev: dùng ts-node thông qua require hook (đã cài ts-node)
        require("ts-node").register({ project: path.join(__dirname, "..", "tsconfig.json"), transpileOnly: true });
        require(path.join(__dirname, "..", "server", "index.ts"));
    }
}

// ── Chờ Express server sẵn sàng để nhận request ──────────────────────────
function waitForServer(port: number, timeoutMs = 20000): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;

        const check = () => {
            const req = http.get(`http://127.0.0.1:${port}/api/status`, (res) => {
                res.resume(); // drain response
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            });
            req.on("error", retry);
            req.setTimeout(1000, () => { req.destroy(); retry(); });
        };

        const retry = () => {
            if (Date.now() >= deadline) {
                reject(new Error(`Server không phản hồi sau ${timeoutMs / 1000}s`));
                return;
            }
            setTimeout(check, 400);
        };

        check();
    });
}

// ── Tạo cửa sổ chính ──────────────────────────────────────────────────────
function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        title: "Rewards Tool",
        backgroundColor: "#09090b", // khớp bg-background của app
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
        show: false, // hiện sau khi load xong để tránh flash trắng
    });

    mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);

    // Hiện cửa sổ khi React đã render xong
    mainWindow.once("ready-to-show", () => {
        mainWindow!.show();
        mainWindow!.focus();
    });

    // Mở link ngoài (href target="_blank") bằng browser mặc định thay vì mở cửa sổ Electron mới
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Chỉ cho phép mở các URL http/https ra ngoài
        if (url.startsWith("http://") || url.startsWith("https://")) {
            shell.openExternal(url);
        }
        return { action: "deny" };
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// ── Auto-update ───────────────────────────────────────────────────────────
function setupAutoUpdater(): void {
    // Kiểm tra update khi app vừa mở; nếu có sẽ tải ngầm
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        log.warn("[updater] Không thể check update:", err?.message);
    });

    autoUpdater.on("checking-for-update", () => {
        log.info("[updater] Đang kiểm tra bản cập nhật...");
    });

    autoUpdater.on("update-available", (info) => {
        log.info(`[updater] Có bản mới: v${info.version} — đang tải ngầm...`);
    });

    autoUpdater.on("update-not-available", () => {
        log.info("[updater] Đang dùng bản mới nhất.");
    });

    autoUpdater.on("download-progress", (prog) => {
        const pct = Math.round(prog.percent);
        mainWindow?.setProgressBar(pct / 100); // hiển thị progress trên taskbar
        log.info(`[updater] Tải: ${pct}%`);
    });

    autoUpdater.on("update-downloaded", (info) => {
        mainWindow?.setProgressBar(-1); // xóa progress bar taskbar
        log.info(`[updater] Đã tải xong v${info.version}`);

        dialog
            .showMessageBox(mainWindow!, {
                type: "info",
                title: "Cập nhật sẵn sàng",
                message: `Bản v${info.version} đã tải xong.`,
                detail: "Khởi động lại app để áp dụng bản cập nhật mới nhất?",
                buttons: ["Khởi động lại ngay", "Để sau"],
                defaultId: 0,
            })
            .then(({ response }) => {
                if (response === 0) {
                    autoUpdater.quitAndInstall(false, true);
                }
            });
    });

    autoUpdater.on("error", (err) => {
        log.error("[updater] Lỗi:", err?.message);
    });
}

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    try {
        log.info(`[main] Khởi động Rewards Tool v${app.getVersion()}`);

        await startServer();
        log.info("[main] Server đã import, chờ listen...");

        await waitForServer(SERVER_PORT);
        log.info(`[main] Server sẵn sàng tại :${SERVER_PORT}`);

        createWindow();

        // Auto-update chỉ chạy khi app đã đóng gói (không chạy trong dev)
        if (app.isPackaged) {
            // Delay nhỏ để UI kịp render trước khi check update
            setTimeout(setupAutoUpdater, 5000);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error("[main] Lỗi khởi động:", msg);
        dialog.showErrorBox(
            "Lỗi khởi động Rewards Tool",
            `Không thể khởi động server:\n\n${msg}\n\nKiểm tra log tại:\n${log.transports.file.getFile().path}`,
        );
        app.quit();
    }
});

// Đóng app khi tất cả cửa sổ bị đóng (Windows / Linux)
app.on("window-all-closed", () => {
    app.quit();
});

// macOS: mở lại cửa sổ khi click icon dock
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
