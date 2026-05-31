/**
 * @fileoverview Khởi động trình duyệt và thực hiện vòng lặp tìm kiếm cho một profile.
 *
 * Kiểm tra `taskController.shouldStop` sau mỗi lượt để hỗ trợ dừng từ Web UI.
 *
 * SELECTOR CẦN THEO DÕI:
 *   - Thanh tìm kiếm Bing: `textarea[name="q"], input[name="q"]`
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import os from "os";
import { CONFIG } from "./config";
import { sleep, copyDirRecursive } from "./utils";
import { fetchRobustWikiText } from "./wiki";
import { dismissCookieConsent } from "./browser";
import { completeRewardsActivities } from "./rewards";
import { log, emitProgress } from "./logger";
import { taskController } from "./taskController";
import type { EdgeProfile } from "./profiles";

const sig = () => taskController.signal;

/**
 * Thực hiện toàn bộ tác vụ (search + rewards) cho một profile Edge.
 *
 * @param selectedProfile - Profile cần xử lý
 * @param maxSearches     - Số lượt tìm kiếm tối đa
 * @param isParallel      - true nếu đang chạy đồng thời với profile khác
 */
export async function performProfileTask(
    selectedProfile: EdgeProfile,
    maxSearches: number,
    isParallel = false,
): Promise<void> {
    const prefix = `[${selectedProfile.name}]`;
    log(`\n>>> BẮT ĐẦU: ${prefix} (${selectedProfile.email})`);

    // Luôn copy sang temp dir để tránh SingletonLock của Edge.
    // Khi Edge đang mở với BẤT KỲ profile nào, nó đặt SingletonLock vào userDataDir gốc.
    // Dùng temp dir riêng biệt sẽ không bị ảnh hưởng bởi lock đó.
    // Cookie sẽ được copy đầy đủ miễn là profile CỤ THỂ này không đang mở trong Edge.
    let contextUserDataDir: string;
    let profileDir: string;
    let tempDir: string | null = null;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "reward-"));
    const srcProfile = path.join(CONFIG.userDataDir, selectedProfile.folder);
    const destProfile = path.join(tempDir, "Default");
    log(`${prefix} Đang sao chép profile vào thư mục tạm...`);
    await copyDirRecursive(srcProfile, destProfile);

    // Kiểm tra cookies có được copy không
    const cookiesOk =
        fs.existsSync(path.join(destProfile, "Cookies")) || fs.existsSync(path.join(destProfile, "Network", "Cookies"));
    if (!cookiesOk) {
        log(`${prefix} ⚠️  Cookies bị bỏ qua — profile này có thể đang mở trong Edge. Rewards sẽ không đăng nhập.`);
    }

    contextUserDataDir = tempDir;
    profileDir = "Default";

    try {
        const context = await chromium.launchPersistentContext(contextUserDataDir, {
            channel: "msedge",
            headless: false,
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
            viewport: { width: 1280, height: 720 },
            ignoreDefaultArgs: ["--enable-automation"],
            args: [
                `--profile-directory=${profileDir}`,
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars",
            ],
        });
        taskController.registerContext(context);

        const page = await context.newPage();

        // Anti-detection
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", { get: () => undefined });
            (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
            Object.defineProperty(navigator, "languages", { get: () => ["vi-VN", "vi", "en-US", "en"] });
        });

        // Auto-dismiss cookie consent trên mọi tab/popup mới
        context.on("page", (newPage) => {
            newPage.on("load", () => dismissCookieConsent(newPage).catch(() => {}));
        });

        await page.goto("https://www.bing.com");
        await dismissCookieConsent(page);
        log(`${prefix} Đang chờ ổn định tài khoản (5s)...`);
        await sleep(5000, sig());
        // Dismiss lần 2 sau khi page ổn định — cookie popup thường render chậm hơn load event
        await dismissCookieConsent(page);

        let totalSearched = 0;

        outer: while (totalSearched < maxSearches) {
            if (taskController.shouldStop) break;

            const rawText = await fetchRobustWikiText();
            const words = rawText
                .replace(/[\n\r.,!?()"]/g, "")
                .split(/\s+/)
                .filter((w) => w.length > 0);
            let i = 0;

            while (i < words.length && totalSearched < maxSearches) {
                if (taskController.shouldStop) break outer;

                const chunkSize = Math.floor(Math.random() * 5) + 6;
                const query = words.slice(i, i + chunkSize).join(" ");
                if (!query.trim()) {
                    i += chunkSize;
                    continue;
                }

                totalSearched++;
                log(`${prefix} [${totalSearched}/${maxSearches}] Đang tìm: "${query}"`);
                emitProgress(selectedProfile.name, totalSearched, maxSearches);

                try {
                    await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 20000 });
                    await dismissCookieConsent(page);

                    const searchBox = await page.waitForSelector('textarea[name="q"], input[name="q"]', {
                        timeout: 10000,
                    });
                    await searchBox.hover();
                    await sleep(500);
                    await searchBox.click();

                    await page.keyboard.type(query, { delay: Math.random() * 100 + 50 });
                    await page.keyboard.press("Enter");
                    await page.waitForLoadState("domcontentloaded").catch(() => {});
                    await sleep(3000, sig());

                    await page.evaluate(() => {
                        window.scrollBy(0, Math.floor(Math.random() * 500) + 200);
                    });

                    const waitTime =
                        Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
                    log(`${prefix} Nghỉ ${waitTime / 1000}s...`);
                    await sleep(waitTime, sig());
                } catch (err) {
                    const msg = (err as Error).message;
                    log(`${prefix} Lỗi search: ${msg} — bỏ qua, tiếp tục`);
                    // Nếu browser/context đã đóng thì không recover được — thoát luôn
                    if (msg.includes("closed")) break outer;
                    await page
                        .goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 15000 })
                        .catch(() => {});
                }
                i += chunkSize;
            }
        }

        if (!taskController.shouldStop) {
            // Đảm bảo page ổn định trước khi vào rewards
            log(`${prefix} Chuẩn bị vào trang Rewards...`);
            await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
            await sleep(2000);
            await completeRewardsActivities(page, selectedProfile.name);
        }

        log(`\n<<< HOÀN THÀNH: ${prefix}`);
        taskController.unregisterContext(context);
        await context.close();
    } catch (err) {
        log(`${prefix} LỖI NGHIÊM TRỌNG: ${(err as Error).message}`);
    } finally {
        if (tempDir) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {
                /* bỏ qua */
            }
        }
    }
}
