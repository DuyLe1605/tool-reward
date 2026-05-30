/**
 * @fileoverview Cờ dừng toàn cục để huỷ task đang chạy từ Web UI.
 *
 * Vì Playwright không có cơ chế cancel built-in, ta dùng cờ `shouldStop`.
 * Vòng lặp search kiểm tra cờ này sau mỗi lượt để dừng sớm khi user click Stop.
 */

class TaskController {
    private _shouldStop = false;
    private _running = false;

    /** Đặt cờ dừng — vòng lặp search sẽ dừng sau lượt hiện tại. */
    stop(): void {
        this._shouldStop = true;
    }

    /** Reset cờ trước khi bắt đầu task mới. */
    reset(): void {
        this._shouldStop = false;
        this._running = true;
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
}

export const taskController = new TaskController();
