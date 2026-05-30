/**
 * @fileoverview Cờ dừng toàn cục để huỷ task đang chạy từ Web UI.
 *
 * Dùng AbortController để ngắt sleep() và các thao tác async ngay lập tức
 * thay vì đợi hết timeout hiện tại.
 */

class TaskController {
    private _shouldStop = false;
    private _running = false;
    private _abortController = new AbortController();

    /** Đặt cờ dừng và abort signal — mọi sleep() đang chờ sẽ kết thúc ngay. */
    stop(): void {
        this._shouldStop = true;
        this._abortController.abort();
    }

    /** Reset cờ trước khi bắt đầu task mới. */
    reset(): void {
        this._shouldStop = false;
        this._running = true;
        this._abortController = new AbortController();
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
