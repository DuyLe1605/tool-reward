/**
 * @fileoverview Giao diện dòng lệnh (CLI) — nhận input người dùng và điều phối tác vụ.
 *
 * Module này là tầng trên cùng của ứng dụng:
 *   1. Kill các tiến trình Edge đang chạy (tránh xung đột userDataDir)
 *   2. Đọc và hiển thị danh sách profile
 *   3. Hỏi người dùng: chọn profile, số lượt search, chế độ chạy
 *   4. Gọi performProfileTask theo chế độ song song hoặc tuần tự
 */

const readline = require("readline");
const { execSync } = require("child_process");
const { getEdgeProfiles, parseChoices } = require("./profiles");
const { performProfileTask } = require("./search");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

/**
 * Hiển thị một câu hỏi trên terminal và chờ người dùng nhập trả lời.
 *
 * @param {string} query - Chuỗi prompt hiển thị cho người dùng.
 * @returns {Promise<string>} Chuỗi người dùng nhập (chưa trim).
 */
function askQuestion(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Hàm khởi động chính — điều phối toàn bộ luồng chương trình.
 *
 * LUỒNG XỬ LÝ:
 *   1. Kill msedge.exe để đảm bảo không có instance Edge nào đang giữ lock file
 *   2. Đọc và hiển thị danh sách profile từ Edge
 *   3. Người dùng chọn profile (hỗ trợ: số đơn, danh sách, khoảng, "all")
 *   4. Người dùng nhập số lượt search mỗi profile
 *   5. Nếu chọn nhiều profile: hỏi chế độ song song (p) hay tuần tự (s)
 *   6. Chạy tác vụ và chờ hoàn thành
 *
 * CHẾ ĐỘ SONG SONG (p):
 *   Tất cả profile chạy đồng thời bằng Promise.all.
 *   Mỗi profile dùng thư mục tạm riêng biệt (xem search.js).
 *   Phù hợp khi có nhiều profile và muốn tiết kiệm thời gian.
 *
 * CHẾ ĐỘ TUẦN TỰ (s):
 *   Profile chạy lần lượt, dùng userDataDir gốc.
 *   An toàn hơn, ít tốn RAM hơn.
 *
 * @returns {Promise<void>}
 */
async function runAutoSearch() {
    try {
        console.log("Đang dọn dẹp tiến trình Edge...");
        execSync("taskkill /F /IM msedge.exe /T", { stdio: "ignore" });
    } catch (e) {}

    console.log("=========================================");
    console.log("   BING REWARDS AUTO SEARCH TOOL v8.1");
    console.log("   (MULTI-PROFILE SUPPORT)");
    console.log("=========================================\n");

    const profiles = getEdgeProfiles();
    profiles.forEach((p, index) => console.log(`${index + 1}. [${p.name}] - ${p.email}`));

    console.log('\nHD: Nhập số (1,2), khoảng (1-3), hoặc "all"');
    const choiceInput = (await askQuestion("Chọn các Profile [1]: ")) || "1";
    const selectedIndices = parseChoices(choiceInput, profiles.length);

    if (selectedIndices.length === 0) {
        console.log("Không có profile nào được chọn. Thoát.");
        rl.close();
        return;
    }

    const maxSearches = parseInt((await askQuestion("Số lượt search mỗi profile [35]: ")) || "35");
    const mode =
        selectedIndices.length > 1 ? (await askQuestion("Chạy song song (p) hay lần lượt (s)? [s]: ")) || "s" : "s";

    console.log(`\nBắt đầu xử lý ${selectedIndices.length} profile...\n`);

    if (mode.toLowerCase() === "p") {
        // Song song — mỗi profile dùng thư mục tạm riêng biệt
        const tasks = selectedIndices.map((idx) => performProfileTask(profiles[idx], maxSearches, true));
        await Promise.all(tasks);
    } else {
        // Tuần tự — dùng trực tiếp userDataDir gốc
        for (const idx of selectedIndices) {
            await performProfileTask(profiles[idx], maxSearches, false);
        }
    }

    console.log("\n=========================================");
    console.log("   TẤT CẢ TÁC VỤ ĐÃ HOÀN THÀNH!");
    console.log("=========================================");
    rl.close();
}

module.exports = { runAutoSearch, rl };
