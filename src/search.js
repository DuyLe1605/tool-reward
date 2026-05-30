/**
 * @fileoverview Khởi động trình duyệt và thực hiện vòng lặp tìm kiếm cho một profile.
 *
 * Module này là "bộ điều phối" cho một profile đơn lẻ:
 *   1. (Song song) Sao chép profile vào thư mục tạm để tránh xung đột
 *   2. Khởi động Edge với profile tương ứng
 *   3. Cài đặt anti-detection (ẩn dấu hiệu automation)
 *   4. Thực hiện N lượt tìm kiếm Bing với từ khóa từ Wikipedia
 *   5. Hoàn thành các nhiệm vụ Rewards
 *   6. Đóng trình duyệt và dọn dẹp thư mục tạm (nếu có)
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { CONFIG } = require("./config");
const { sleep, copyDirRecursive } = require("./utils");
const { fetchRobustWikiText } = require("./wiki");
const { dismissCookieConsent } = require("./browser");
const { completeRewardsActivities } = require("./rewards");

/**
 * Thực hiện toàn bộ tác vụ (search + rewards) cho một profile Edge.
 *
 * ─── CHẾ ĐỘ SONG SONG (isParallel = true) ───────────────────────────────────
 * Playwright yêu cầu mỗi instance trình duyệt có một userDataDir riêng biệt.
 * Nếu dùng chung thư mục, Edge sẽ báo "Opening in existing browser session"
 * và instance thứ hai sẽ fail ngay lập tức.
 *
 * Giải pháp: Copy thư mục profile vào os.tmpdir() trước khi launch.
 *   - srcProfile: .../Edge/User Data/<folder>  (vd: "Profile 1")
 *   - destProfile: <tempDir>/Default           (luôn dùng tên "Default" trong tempDir)
 * Sau khi hoàn thành, tempDir bị xóa trong finally block.
 *
 * ─── CHẾ ĐỘ TUẦN TỰ (isParallel = false) ────────────────────────────────────
 * Dùng trực tiếp userDataDir gốc, không cần sao chép.
 *
 * ─── ANTI-DETECTION ─────────────────────────────────────────────────────────
 * Bing có thể phát hiện automation qua các dấu hiệu:
 *   - navigator.webdriver = true  → Override bằng addInitScript
 *   - Không có window.chrome      → Tạo object giả
 *   - navigator.languages rỗng   → Set languages tự nhiên
 *   - Flag --enable-automation    → Loại bỏ bằng ignoreDefaultArgs
 *   - Flag AutomationControlled   → Disable bằng --disable-blink-features
 *
 * @param {{ folder: string, name: string, email: string }} selectedProfile
 *   Profile cần xử lý.
 * @param {number}  maxSearches - Số lượt tìm kiếm tối đa cho profile này.
 * @param {boolean} [isParallel=false] - true nếu đang chạy đồng thời với profile khác.
 * @returns {Promise<void>}
 */
async function performProfileTask(selectedProfile, maxSearches, isParallel = false) {
    const prefix = `[${selectedProfile.name}]`;
    console.log(`\n>>> BẮT ĐẦU: ${prefix} (${selectedProfile.email})`);

    let contextUserDataDir = CONFIG.userDataDir;
    let profileDir = selectedProfile.folder;
    let tempDir = null;

    if (isParallel) {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "reward-"));
        const srcProfile = path.join(CONFIG.userDataDir, selectedProfile.folder);
        const destProfile = path.join(tempDir, "Default");
        console.log(`${prefix} Đang sao chép profile vào thư mục tạm...`);
        await copyDirRecursive(srcProfile, destProfile);
        contextUserDataDir = tempDir;
        profileDir = "Default";
    }

    try {
        const context = await chromium.launchPersistentContext(contextUserDataDir, {
            channel: "msedge",
            headless: false,
            userAgent:
                "Mozilla/5.0 (Windows NT NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
            viewport: { width: 1280, height: 720 },
            ignoreDefaultArgs: ["--enable-automation"],
            args: [
                `--profile-directory=${profileDir}`,
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars",
            ],
        });

        const page = await context.newPage();

        // Ẩn các dấu hiệu automation để Bing không phát hiện bot
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, "languages", { get: () => ["vi-VN", "vi", "en-US", "en"] });
        });

        // Tự động dismiss cookie consent trên mọi tab/popup mới
        context.on("page", async (newPage) => {
            newPage.on("load", () => dismissCookieConsent(newPage).catch(() => {}));
        });

        await page.goto("https://www.bing.com");
        await dismissCookieConsent(page);
        console.log(`${prefix} Đang chờ ổn định tài khoản (5s)...`);
        await sleep(5000);

        // Vòng lặp tìm kiếm chính
        let totalSearched = 0;
        while (totalSearched < maxSearches) {
            const rawText = await fetchRobustWikiText();
            const words = rawText
                .replace(/[\n\r.,!?()"]/g, "")
                .split(/\s+/)
                .filter((w) => w.length > 0);
            let i = 0;

            while (i < words.length && totalSearched < maxSearches) {
                // Tạo câu query với số từ ngẫu nhiên trong khoảng 6-10
                const chunkSize = Math.floor(Math.random() * 5) + 6;
                const query = words.slice(i, i + chunkSize).join(" ");
                if (!query.trim()) {
                    i += chunkSize;
                    continue;
                }

                totalSearched++;
                console.log(`${prefix} [${totalSearched}/${maxSearches}] Đang tìm: "${query}"`);

                try {
                    await page.goto("https://www.bing.com", { waitUntil: "networkidle" });
                    await dismissCookieConsent(page);

                    // Selector thanh tìm kiếm — cập nhật nếu Bing đổi từ input sang textarea
                    const searchBox = await page.waitForSelector('textarea[name="q"], input[name="q"]', {
                        timeout: 10000,
                    });

                    await searchBox.hover();
                    await sleep(500);
                    await searchBox.click();

                    // Gõ từng ký tự với delay ngẫu nhiên để mô phỏng gõ thật
                    await page.keyboard.type(query, { delay: Math.random() * 100 + 50 });
                    await page.keyboard.press("Enter");
                    await page.waitForLoadState("networkidle");
                    await sleep(3000);

                    // Scroll ngẫu nhiên để mô phỏng người dùng đọc kết quả
                    await page.evaluate(() => {
                        window.scrollBy(0, Math.floor(Math.random() * 500) + 200);
                    });

                    const waitTime =
                        Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
                    console.log(`${prefix} Nghỉ ${waitTime / 1000} giây...`);
                    await sleep(waitTime);
                } catch (err) {
                    console.error(`${prefix} Lỗi search: ${err.message}`);
                    break;
                }
                i += chunkSize;
            }
        }

        await completeRewardsActivities(page);

        console.log(`\n<<< HOÀN THÀNH: ${prefix}`);
        await context.close();
    } catch (err) {
        console.error(`${prefix} LỖI NGHIÊM TRỌNG: ${err.message}`);
        console.log(`${prefix} Có thể do Profile đang được mở ở một cửa sổ khác.`);
    } finally {
        if (tempDir) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log(`${prefix} Đã dọn dẹp thư mục tạm.`);
            } catch (e) {}
        }
    }
}

module.exports = { performProfileTask };
