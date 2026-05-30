/**
 * @fileoverview Giao diện dòng lệnh (CLI) — chế độ chạy truyền thống không cần browser UI.
 */

import readline from "readline";
import { execSync } from "child_process";
import { getEdgeProfiles, parseChoices } from "./profiles";
import { performProfileTask } from "./search";
import { taskController } from "./taskController";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askQuestion(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve));
}

export async function runAutoSearch(): Promise<void> {
    try {
        console.log("Đang dọn dẹp tiến trình Edge...");
        execSync("taskkill /F /IM msedge.exe /T", { stdio: "ignore" });
    } catch {
        /* Edge chưa chạy */
    }

    console.log("=========================================");
    console.log("   BING REWARDS AUTO SEARCH TOOL v9.0");
    console.log("   (MULTI-PROFILE SUPPORT)");
    console.log("=========================================\n");

    const profiles = getEdgeProfiles();
    profiles.forEach((p, i) => console.log(`${i + 1}. [${p.name}] - ${p.email}`));

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
    taskController.reset();

    if (mode.toLowerCase() === "p") {
        await Promise.all(selectedIndices.map((idx) => performProfileTask(profiles[idx], maxSearches, true)));
    } else {
        for (const idx of selectedIndices) {
            if (taskController.shouldStop) break;
            await performProfileTask(profiles[idx], maxSearches, false);
        }
    }

    taskController.done();
    console.log("\n=========================================");
    console.log("   TẤT CẢ TÁC VỤ ĐÃ HOÀN THÀNH!");
    console.log("=========================================");
    rl.close();
}

export { rl };
