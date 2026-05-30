/**
 * @fileoverview Entry point của ứng dụng. Chỉ khởi động CLI.
 * Mọi logic nghiệp vụ nằm trong thư mục src/.
 *
 * Cấu trúc module:
 *   src/config.js   — Cấu hình trung tâm (URL, delay, đường dẫn Edge)
 *   src/utils.js    — Hàm tiện ích: sleep, copyDirRecursive
 *   src/profiles.js — Đọc profile Edge, parse lựa chọn CLI
 *   src/wiki.js     — Lấy văn bản Wikipedia để tạo câu tìm kiếm
 *   src/browser.js  — Tương tác trình duyệt: cookie consent, quiz/poll
 *   src/rewards.js  — Xử lý nhiệm vụ trang rewards.bing.com
 *   src/search.js   — Khởi động Edge, vòng lặp search, gọi rewards
 *   src/cli.js      — Giao diện dòng lệnh, điều phối toàn bộ tác vụ
 */

const { runAutoSearch, rl } = require("./src/cli");

runAutoSearch().catch((err) => {
    console.error(err);
    rl.close();
});
