/**
 * @fileoverview Đọc danh sách profile Edge từ hệ thống và phân tích lựa chọn từ CLI.
 */

const fs = require("fs");
const path = require("path");
const { CONFIG } = require("./config");

/**
 * Đọc tất cả profile Edge từ file "Local State" của trình duyệt.
 *
 * File nguồn: %LOCALAPPDATA%\Microsoft\Edge\User Data\Local State
 * Cấu trúc JSON cần đọc: data.profile.info_cache[profileKey]
 *   - .name      → tên hiển thị của profile (vd: "Profile 1")
 *   - .user_name → địa chỉ email đăng nhập (có thể rỗng)
 *
 * NẾU CẤU TRÚC FILE THAY ĐỔI (sau update Edge):
 *   Kiểm tra lại đường dẫn `data.profile.info_cache` trong file Local State.
 *   Edge có thể đổi key thành `data.profile.profiles_order` hoặc tương tự.
 *
 * @returns {{ folder: string, name: string, email: string }[]}
 *   Mảng profile với:
 *   - folder: tên thư mục (vd: "Profile 1", "Default")
 *   - name:   tên hiển thị
 *   - email:  email đăng nhập, "No Email" nếu không có
 */
function getEdgeProfiles() {
    const localStatePath = path.join(CONFIG.userDataDir, "Local State");
    const profiles = [];
    if (fs.existsSync(localStatePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
            const infoCache = data.profile.info_cache;
            for (const key in infoCache) {
                profiles.push({
                    folder: key,
                    name: infoCache[key].name || key,
                    email: infoCache[key].user_name || "No Email",
                });
            }
        } catch (e) {}
    }
    return profiles.length ? profiles : [{ folder: "Default", name: "Default", email: "Unknown" }];
}

/**
 * Phân tích chuỗi lựa chọn profile từ người dùng thành mảng chỉ số 0-based.
 *
 * Hỗ trợ các định dạng:
 *   - "all"   → tất cả profile (0 đến max-1)
 *   - "1,3"   → profile 1 và 3 (chuyển thành [0, 2])
 *   - "1-3"   → profile 1 đến 3 (chuyển thành [0, 1, 2])
 *   - "1,3-5" → kết hợp
 *
 * @param {string} input - Chuỗi người dùng nhập từ CLI.
 * @param {number} max   - Tổng số profile hiện có (để giới hạn phạm vi).
 * @returns {number[]} Mảng chỉ số 0-based, đã loại trùng, sắp xếp tăng dần.
 */
function parseChoices(input, max) {
    if (input.toLowerCase() === "all") {
        return Array.from({ length: max }, (_, i) => i);
    }
    const choices = [];
    const parts = input.split(/[, ]+/);
    for (const part of parts) {
        if (part.includes("-")) {
            const [startStr, endStr] = part.split("-");
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= max) choices.push(i - 1);
            }
        } else {
            const val = parseInt(part);
            if (val >= 1 && val <= max) choices.push(val - 1);
        }
    }
    return [...new Set(choices)].sort((a, b) => a - b);
}

module.exports = { getEdgeProfiles, parseChoices };
