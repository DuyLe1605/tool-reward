/**
 * API layer — tất cả HTTP calls tới backend Express đều nằm ở đây.
 * Khi backend đổi route, chỉ cần sửa file này.
 */

import axios from "axios";
import type { EdgeProfile, TaskStatus, PointsSummary } from "@/store/useAppStore";

const http = axios.create({ baseURL: "/api" });

export interface AppState {
    lastCheckedDate: string;
    points: Record<string, PointsSummary>;
}

export const api = {
    /** Lấy danh sách profile Edge từ hệ thống. */
    getProfiles: () => http.get<EdgeProfile[]>("/profiles").then((r) => r.data),

    /** Lấy trạng thái task hiện tại. */
    getStatus: () => http.get<TaskStatus>("/tasks/status").then((r) => r.data),

    /** Bắt đầu task tìm kiếm. */
    startTask: (payload: { profileIndices: number[]; maxSearches: number; mode: "p" | "s" }) =>
        http.post<{ ok: boolean }>("/tasks/start", payload).then((r) => r.data),

    /** Dừng task đang chạy. */
    stopTask: () => http.post<{ ok: boolean }>("/tasks/stop").then((r) => r.data),

    /** Kiểm tra điểm thưởng cho các profile (không search). */
    checkPoints: (profileIndices: number[]) =>
        http.post<{ ok: boolean }>("/tasks/check-points", { profileIndices }).then((r) => r.data),

    /** Lấy app state được lưu server-side (lastCheckedDate + points). */
    getAppState: () => http.get<AppState>("/app-state").then((r) => r.data),

    /** Đánh dấu đã kiểm tra điểm trong ngày hôm nay. */
    markChecked: () => http.post<{ ok: boolean }>("/app-state/checked").then((r) => r.data),
};
