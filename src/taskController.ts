/**
 * @fileoverview Cờ dừng toàn cục để huỷ task đang chạy từ Web UI.
 *
 * Dùng AbortController để ngắt sleep() và các thao tác async ngay lập tức
 * thay vì đợi hết timeout hiện tại.
 *
 * Còn track tất cả BrowserContext đang hoạt động. Khi stop() được gọi,
 * tất cả context bị đóng ngay → các Playwright call đang chờ throw "closed"
 * → break ra khỏi vòng lặp search ngay lập tức, không cần đợi timeout.
 */

import type { BrowserContext } from "playwright";

class TaskController {
    private _shouldStop = false;
    private _running = false;
    private _abortController = new AbortController();
    private _contexts = new Set<BrowserContext>();

    /** Đăng ký một browser context mới — gọi ngay sau launchPersistentContext. */
    registerContext(ctx: BrowserContext): void {
        this._contexts.add(ctx);
    }

    /** Huỷ đăng ký khi context đã đóng. */
    unregisterContext(ctx: BrowserContext): void {
        this._contexts.delete(ctx);
    }

    /** Đặt cờ dừng, abort signal, và đóng tất cả browser đang mở ngay lập tức. */
    stop(): void {
        this._shouldStop = true;
        this._abortController.abort();
        for (const ctx of this._contexts) {
            ctx.close().catch(() => {});
        }
        this._contexts.clear();
    }

    /** Reset cờ trước khi bắt đầu task mới. */
    reset(): void {
        this._shouldStop = false;
        this._running = true;
        this._abortController = new AbortController();
        this._contexts.clear();
    }

    done(): void {
        this._running = false;
    }

    get shouldStop(): boolean {
        return this._shouldStop;
    }

    get running(): boolean {
        return this._running;
    }

    get signal(): AbortSignal {
        return this._abortController.signal;
    }
}

export const taskController = new TaskController();
