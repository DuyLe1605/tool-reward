/**
 * @fileoverview Các hàm tiện ích chung dùng xuyên suốt project.
 */

const fs = require("fs");
const path = require("path");

/**
 * Dừng thực thi async trong một khoảng thời gian nhất định.
 * Dùng để tạo delay tự nhiên giữa các hành động, mô phỏng người dùng thật.
 *
 * @param {number} ms - Số mili-giây cần chờ.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sao chép đệ quy toàn bộ thư mục từ src sang dest.
 * Bỏ qua các file đang bị Edge khóa (lock file) để tránh crash.
 *
 * Dùng trong chế độ song song: mỗi profile cần một userDataDir riêng biệt
 * vì Playwright/Edge không cho phép hai instance dùng chung cùng một thư mục.
 *
 * @param {string} src  - Đường dẫn thư mục nguồn.
 * @param {string} dest - Đường dẫn thư mục đích (tự tạo nếu chưa tồn tại).
 * @returns {Promise<void>}
 */
async function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        try {
            if (entry.isDirectory()) {
                await copyDirRecursive(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        } catch (e) {
            // Bỏ qua file đang bị khóa bởi tiến trình khác (vd: LockFile, SingletonLock)
        }
    }
}

module.exports = { sleep, copyDirRecursive };
