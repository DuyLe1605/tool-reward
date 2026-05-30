/**
 * @fileoverview Cấu hình trung tâm cho toàn bộ ứng dụng.
 *
 * Đây là nơi đầu tiên cần kiểm tra khi:
 *   - Microsoft đổi URL trang Rewards (rewardsUrl)
 *   - Cần điều chỉnh tốc độ search để tránh bị rate-limit (minDelay/maxDelay)
 *   - Cài đặt Edge ở đường dẫn khác (userDataDir)
 */

const path = require("path");

/**
 * Cấu hình toàn cục của ứng dụng.
 *
 * @property {string} userDataDir   - Thư mục dữ liệu người dùng của Edge (chứa tất cả profiles).
 *                                    Mặc định: %LOCALAPPDATA%\Microsoft\Edge\User Data
 * @property {string} wikiApiUrl    - API Wikipedia tiếng Việt để lấy từ khóa tìm kiếm ngẫu nhiên.
 *                                    Thay bằng Wikipedia ngôn ngữ khác nếu muốn đổi nguồn từ.
 * @property {string} rewardsUrl    - Trang nhiệm vụ Bing Rewards. Cập nhật nếu Microsoft đổi URL.
 * @property {number} minQueryWords - Số từ tối thiểu mỗi câu tìm kiếm.
 * @property {number} maxQueryWords - Số từ tối đa mỗi câu tìm kiếm.
 * @property {number} minDelay      - Thời gian nghỉ tối thiểu giữa các lượt search (ms).
 *                                    Tăng lên nếu bị Bing chặn vì search quá nhanh.
 * @property {number} maxDelay      - Thời gian nghỉ tối đa giữa các lượt search (ms).
 */
const CONFIG = {
    userDataDir: path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "User Data"),
    wikiApiUrl:
        "https://vi.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*",
    rewardsUrl: "https://rewards.bing.com/earn",
    minQueryWords: 6,
    maxQueryWords: 10,
    minDelay: 10000,
    maxDelay: 20000,
};

module.exports = { CONFIG };
