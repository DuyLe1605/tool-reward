/**
 * @fileoverview Ngăn Windows tắt màn hình trong lúc task đang chạy.
 *
 * Spawn một tiến trình PowerShell giữ cờ SetThreadExecutionState
 * (ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED) theo vòng lặp.
 * Khi task kết thúc, kill tiến trình đó — Windows tự reset về bình thường.
 */

import { spawn, type ChildProcess } from "child_process";

// PowerShell script: gọi SetThreadExecutionState mỗi 30 giây cho đến khi bị kill
const KEEP_AWAKE_SCRIPT = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class WakeLock {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint esFlags);
}
"@
# ES_CONTINUOUS(0x80000000) | ES_DISPLAY_REQUIRED(0x00000002) | ES_SYSTEM_REQUIRED(0x00000001)
while (\$true) {
    [WakeLock]::SetThreadExecutionState(0x80000003) | Out-Null
    Start-Sleep -Seconds 30
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
