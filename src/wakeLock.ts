/**
 * @fileoverview Ngăn Windows tắt màn hình trong lúc task đang chạy.
 *
 * Spawn một tiến trình PowerShell giữ cờ SetThreadExecutionState
 * (ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED) theo vòng lặp.
 * Khi task kết thúc, kill tiến trình đó — Windows tự reset về bình thường.
 */

import { spawn, type ChildProcess } from "child_process";

// PowerShell script: Gửi Shift+F15 mỗi 59 giây để reset Windows idle timer.
// Cách này không cần compile Add-Type, khởi động ngay lập tức.
// Shift+F15 là tổ hợp phím vô hại (không có app nào dùng F15).
const KEEP_AWAKE_SCRIPT = `
$wsh = New-Object -ComObject WScript.Shell
while ($true) {
    $wsh.SendKeys('+{F15}')
    Start-Sleep -Seconds 59
}
`.trim();

let wakeProcess: ChildProcess | null = null;

/** Bắt đầu giữ màn hình sáng. Gọi khi task start. */
export function preventSleep(): void {
    if (wakeProcess) return;
    wakeProcess = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", KEEP_AWAKE_SCRIPT], {
        stdio: "ignore",
        detached: false,
        windowsHide: true,
    });
    wakeProcess.once("exit", () => {
        wakeProcess = null;
    });
}

/** Giải phóng wake lock. Gọi khi task kết thúc (finally). */
export function allowSleep(): void {
    if (!wakeProcess) return;
    wakeProcess.kill();
    wakeProcess = null;
}
