/**
 * @fileoverview Các hàm tiện ích chung dùng xuyên suốt project.
 */

import fs from "fs";
import path from "path";

/**
 * Dừng thực thi async trong một khoảng thời gian nhất định.
 * Tạo delay tự nhiên giữa các hành động, mô phỏng người dùng thật.
 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sao chép đệ quy toàn bộ thư mục từ src sang dest.
 * Bỏ qua các file đang bị Edge khóa (lock file) để tránh crash.
 *
 * Dùng trong chế độ song song: mỗi profile cần userDataDir riêng biệt
 * vì Playwright/Edge không cho phép hai instance dùng chung một thư mục.
 */
export async function copyDirRecursive(src: string, dest: string): Promise<void> {
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
        } catch {
            // Bỏ qua file đang bị khóa bởi tiến trình khác (vd: LockFile, SingletonLock)
        }
    }
}
