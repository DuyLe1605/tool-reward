/**
 * @fileoverview Cấu hình trung tâm cho toàn bộ ứng dụng.
 *
 * Đây là nơi đầu tiên cần kiểm tra khi:
 *   - Microsoft đổi URL trang Rewards (rewardsUrl)
 *   - Cần điều chỉnh tốc độ search để tránh bị rate-limit (minDelay/maxDelay)
 *   - Cài đặt Edge ở đường dẫn khác (userDataDir)
 */

import path from "path";

export interface AppConfig {
    /** Thư mục dữ liệu người dùng Edge. Mặc định: %LOCALAPPDATA%\Microsoft\Edge\User Data */
    userDataDir: string;
    /** API Wikipedia lấy tiêu đề bài viết ngẫu nhiên. Đổi ngôn ngữ nếu cần. */
    wikiApiUrl: string;
    /** Trang nhiệm vụ Bing Rewards. Cập nhật nếu Microsoft đổi URL. */
    rewardsUrl: string;
    minQueryWords: number;
    maxQueryWords: number;
    /** Thời gian nghỉ tối thiểu giữa các lượt search (ms). Tăng nếu bị Bing chặn. */
    minDelay: number;
    /** Thời gian nghỉ tối đa giữa các lượt search (ms). */
    maxDelay: number;
}

export const CONFIG: AppConfig = {
    userDataDir: path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge", "User Data"),
    wikiApiUrl:
        "https://vi.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*",
    rewardsUrl: "https://rewards.bing.com/earn",
    minQueryWords: 6,
    maxQueryWords: 10,
    minDelay: 10000,
    maxDelay: 20000,
};
