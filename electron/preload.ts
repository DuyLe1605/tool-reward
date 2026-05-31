/**
 * @fileoverview Electron preload script — chạy trong renderer context trước khi web page load.
 *
 * contextIsolation = true nên preload là cầu nối an toàn duy nhất giữa
 * renderer (React app) và main process.
 *
 * Expose một số API cần thiết cho renderer:
 *   - copyText: ghi text vào clipboard qua Electron clipboard module
 *   - openExternal: mở URL bên ngoài bằng browser mặc định của hệ thống
 *   - notifyTaskDone: hiện desktop notification khi task hoàn thành
 */

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    copyText: (text: string) => ipcRenderer.invoke("copy-text", text),
    openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
    notifyTaskDone: (profileCount: number, totalPoints: number) =>
        ipcRenderer.invoke("notify-task-done", profileCount, totalPoints),
});
