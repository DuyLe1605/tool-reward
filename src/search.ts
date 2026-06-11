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
import { fetchRobustWikiText, getFallbackText } from "./wiki";
import { dismissCookieConsent } from "./browser";
import { completeRewardsActivities } from "./rewards";
import { scrapeRewardsPoints, scrapeAvailablePoints, fetchAndEmitPoints } from "./pointsScraper";
import { log, emitProgress, emitPoints } from "./logger";
import { taskController } from "./taskController";
import type { EdgeProfile } from "./profiles";

const sig = () => taskController.signal;

// User agent Android Chrome — Bing nhận diện là mobile và cộng điểm mobile
const MOBILE_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36";

/**
 * Thực hiện search mobile cho một profile.
 * Nhận cookies đã được extract từ desktop context (context đó đã đóng trước khi gọi hàm này).
 * Bing Rewards trao tối đa 20 lượt × 3pts = 60pts/ngày cho mobile.
 */
async function performMobileSearch(
    contextUserDataDir: string,
    launchArgs: string[],
    profileName: string,
    mobileCount: number,
): Promise<void> {
    const prefix = `[${profileName}] [📱 Mobile]`;
    log(`${prefix} Bắt đầu search mobile (${mobileCount} lượt)...`);

    const mobileContext = await chromium.launchPersistentContext(contextUserDataDir, {
        channel: "msedge",
        headless: false,
        userAgent: MOBILE_USER_AGENT,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        ignoreDefaultArgs: ["--enable-automation"],
        args: launchArgs,
    });
    taskController.registerContext(mobileContext);

    const page = await mobileContext.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "languages", { get: () => ["vi-VN", "vi", "en-US", "en"] });
    });

    // Auto-dismiss cookie consent: handler liên tục + load event
    const mobileConsentSelectors = [
        'button:has-text("Accept")',
        'button:has-text("Accept all")',
        "#bnp_btn_accept a",
        "#bnp_btn_accept",
    ].join(", ");
    const dismissMobileConsent = async () => {
        try {
            const btn = page.locator(mobileConsentSelectors).first();
            if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btn.click({ force: true }).catch(() => {});
            }
        } catch {
            /* bỏ qua */
        }
    };
    // Trigger sau mỗi lần trang load xong
    page.on("load", () => dismissMobileConsent());
    // addLocatorHandler dự phòng
    await page
        .addLocatorHandler(page.locator(mobileConsentSelectors).first(), async (btn) => {
            await btn.click({ force: true }).catch(() => {});
        })
        .catch(() => {});

    let searched = 0;

    try {
        await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 20000 });
        await dismissMobileConsent();
        await sleep(1500);
        await dismissMobileConsent(); // popup đôi khi load chậm hơn trang
        await sleep(1500, sig());

        let emptyRetries = 0;
        outer: while (searched < mobileCount) {
            if (taskController.shouldStop) break;

            const rawText = await fetchRobustWikiText();
            const words = rawText
                .replace(/[\n\r.,!?()"]/g, "")
                .split(/\s+/)
                .filter((w) => w.length > 0);

            if (words.length === 0) {
                emptyRetries++;
                if (emptyRetries >= 3) {
                    log(`${prefix} ⚠️  Wikipedia không khả dụng — dùng từ khóa dự phòng.`);
                    emptyRetries = 0;
                    const fallbackText = getFallbackText();
                    const fallbackWords = fallbackText.split(/\s+/).filter((w) => w.length > 0);
                    let fi = 0;
                    while (fi < fallbackWords.length && searched < mobileCount) {
                        if (taskController.shouldStop) break outer;
                        const chunkSize = Math.floor(Math.random() * 5) + 6;
                        const query = fallbackWords.slice(fi, fi + chunkSize).join(" ");
                        fi += chunkSize;
                        if (!query.trim()) continue;
                        searched++;
                        log(`${prefix} [${searched}/${mobileCount}] (fallback): "${query}"`);
                        emitProgress(profileName, searched, mobileCount, "mobile");
                        try {
                            await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 20000 });
                            await dismissCookieConsent(page);
                            const searchBox = await page
                                .waitForSelector('textarea[name="q"], input[name="q"]', { timeout: 10000 })
                                .catch(() => null);
                            if (!searchBox) continue;
                            await searchBox.tap();
                            await sleep(400);
                            await page.keyboard.type(query, { delay: Math.random() * 80 + 40 });
                            await page.keyboard.press("Enter");
                            await page.waitForLoadState("domcontentloaded").catch(() => {});
                            await sleep(2500, sig());
                            const waitTime =
                                Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
                            await sleep(waitTime, sig());
                        } catch (err) {
                            const msg = (err as Error).message;
                            log(`${prefix} Lỗi: ${msg} — bỏ qua`);
                            if (msg.includes("closed")) break outer;
                        }
                    }
                    continue;
                }
                await sleep(3000, sig());
                continue;
            }
            emptyRetries = 0;

            let i = 0;

            while (i < words.length && searched < mobileCount) {
                if (taskController.shouldStop) break outer;

                const chunkSize = Math.floor(Math.random() * 5) + 6;
                const query = words.slice(i, i + chunkSize).join(" ");
                if (!query.trim()) {
                    i += chunkSize;
                    continue;
                }

                searched++;
                log(`${prefix} [${searched}/${mobileCount}] "${query}"`);
                emitProgress(profileName, searched, mobileCount, "mobile");

                try {
                    await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 20000 });
                    await dismissCookieConsent(page);

                    const searchBox = await page
                        .waitForSelector('textarea[name="q"], input[name="q"]', { timeout: 10000 })
                        .catch(() => null);
                    if (!searchBox) {
                        i += chunkSize;
                        continue;
                    }

                    await searchBox.tap();
                    await sleep(400);
                    await page.keyboard.type(query, { delay: Math.random() * 80 + 40 });
                    await page.keyboard.press("Enter");
                    await page.waitForLoadState("domcontentloaded").catch(() => {});
                    await sleep(2500, sig());

                    const waitTime =
                        Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
                    log(`${prefix} Nghỉ ${waitTime / 1000}s...`);
                    await sleep(waitTime, sig());
                } catch (err) {
                    const msg = (err as Error).message;
                    log(`${prefix} Lỗi: ${msg} — bỏ qua`);
                    if (msg.includes("closed")) break outer;
                }

                i += chunkSize;
            }
        }
    } finally {
        taskController.unregisterContext(mobileContext);
        await mobileContext.close().catch(() => {});
    }

    log(`${prefix} ✅ Hoàn thành mobile search (${searched}/${mobileCount} lượt).`);
}

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
    mobileSearches: number,
    searchType: "desktop" | "mobile" | "both",
    isParallel = false,
): Promise<void> {
    const prefix = `[${selectedProfile.name}]`;
    const modeLabel =
        searchType === "desktop" ? "🖥 Desktop" : searchType === "mobile" ? "📱 Mobile" : "🔀 Desktop+Mobile";
    log(`\n>>> BẮt ĐẦU: ${prefix} (${selectedProfile.email}) — ${modeLabel}`);

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

    // Sao chép Local State để giải mã cookies đúng profile
    const localStateSrc = path.join(CONFIG.userDataDir, "Local State");
    const localStateDest = path.join(tempDir, "Local State");
    if (fs.existsSync(localStateSrc)) {
        try {
            fs.copyFileSync(localStateSrc, localStateDest);
        } catch (err) {
            log(`${prefix} ⚠️  Không thể sao chép Local State: ${(err as Error).message}`);
        }
    }

    // Kiểm tra cookies có được copy không
    const cookiesOk =
        fs.existsSync(path.join(destProfile, "Cookies")) || fs.existsSync(path.join(destProfile, "Network", "Cookies"));
    if (!cookiesOk) {
        log(`${prefix} ⚠️  Cookies bị bỏ qua — profile này có thể đang mở trong Edge. Rewards sẽ không đăng nhập.`);
    }

    contextUserDataDir = tempDir;
    profileDir = "Default";

    const launchArgs = [
        `--profile-directory=${profileDir}`,
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-infobars",
    ];

    // ── Mobile-only: chỉ cần cookies, không cần mở cửa sổ Edge ───────────────
    if (searchType === "mobile") {
        try {
            if (!taskController.shouldStop && mobileSearches > 0) {
                await performMobileSearch(contextUserDataDir, launchArgs, selectedProfile.name, mobileSearches);
            }

            // Scrape điểm sau mobile search
            if (!taskController.shouldStop) {
                try {
                    log(`${prefix} Scraping điểm sau mobile search...`);
                    const ptsCtx = await chromium.launchPersistentContext(contextUserDataDir, {
                        channel: "msedge",
                        headless: false,
                        args: launchArgs,
                    });
                    const ptsPage = await ptsCtx.newPage();
                    await fetchAndEmitPoints(ptsPage, selectedProfile.name, selectedProfile.email);
                    await ptsCtx.close();
                } catch {
                    // Điểm không scrape được — bỏ qua
                }
            }
        } catch (err) {
            log(`${prefix} LỖI: ${(err as Error).message}`);
        } finally {
            if (tempDir) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch {
                    /* bỏ qua */
                }
            }
        }
        log(`\n<<< HOÀN THÀNH: ${prefix}`);
        return;
    }

    // ── Desktop / Both: mở Edge bình thường ──────────────────────────────────
    try {
        const context = await chromium.launchPersistentContext(contextUserDataDir, {
            channel: "msedge",
            headless: false,
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
            viewport: { width: 1280, height: 720 },
            ignoreDefaultArgs: ["--enable-automation"],
            args: launchArgs,
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

        await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 20000 });
        await dismissCookieConsent(page);
        log(`${prefix} Đang chờ ổn định tài khoản (5s)...`);
        await sleep(5000, sig());
        // Dismiss lần 2 sau khi page ổn định — cookie popup thường render chậm hơn load event
        await dismissCookieConsent(page);

        let totalSearched = 0;

        // ── Desktop search ──────────────────────────────────────────────────────────────
        {
            let emptyRetries = 0;
            outer: while (totalSearched < maxSearches) {
                if (taskController.shouldStop) break;

                const rawText = await fetchRobustWikiText();
                const words = rawText
                    .replace(/[\n\r.,!?()"]/g, "")
                    .split(/\s+/)
                    .filter((w) => w.length > 0);

                if (words.length === 0) {
                    emptyRetries++;
                    if (emptyRetries >= 3) {
                        log(`${prefix} ⚠️  Wikipedia không khả dụng — dùng từ khóa dự phòng.`);
                        emptyRetries = 0;
                        // Dùng fallback thay vì bỏ search
                        const fallbackText = getFallbackText();
                        const fallbackWords = fallbackText.split(/\s+/).filter((w) => w.length > 0);
                        let fi = 0;
                        while (fi < fallbackWords.length && totalSearched < maxSearches) {
                            if (taskController.shouldStop) break outer;
                            const chunkSize = Math.floor(Math.random() * 5) + 6;
                            const query = fallbackWords.slice(fi, fi + chunkSize).join(" ");
                            fi += chunkSize;
                            if (!query.trim()) continue;
                            totalSearched++;
                            log(`${prefix} [${totalSearched}/${maxSearches}] Đang tìm (fallback): "${query}"`);
                            emitProgress(selectedProfile.name, totalSearched, maxSearches, "desktop");
                            try {
                                await page.goto("https://www.bing.com", {
                                    waitUntil: "domcontentloaded",
                                    timeout: 20000,
                                });
                                await dismissCookieConsent(page);
                                const searchBox = await page.waitForSelector('textarea[name="q"], input[name="q"]', {
                                    timeout: 10000,
                                });
                                await searchBox.click();
                                await page.keyboard.type(query, { delay: Math.random() * 100 + 50 });
                                await page.keyboard.press("Enter");
                                await page.waitForLoadState("domcontentloaded").catch(() => {});
                                await sleep(3000, sig());
                                const waitTime =
                                    Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) +
                                    CONFIG.minDelay;
                                await sleep(waitTime, sig());
                            } catch (err) {
                                const msg = (err as Error).message;
                                log(`${prefix} Lỗi search: ${msg} — bỏ qua`);
                                if (msg.includes("closed")) break outer;
                            }
                        }
                        continue;
                    }
                    await sleep(3000, sig());
                    continue;
                }
                emptyRetries = 0;

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
                    emitProgress(selectedProfile.name, totalSearched, maxSearches, "desktop");

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
        } // end desktop search block

        // Rewards activities
        if (!taskController.shouldStop) {
            log(`${prefix} Chuẩn bị vào trang Rewards...`);
            await page.goto("https://www.bing.com", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
            await sleep(2000);
            await completeRewardsActivities(page, selectedProfile.name, selectedProfile.email);
        }

        // Mobile search (chỉ khi searchType = "both") — đóng desktop TRƯỚC khi mở mobile
        if (!taskController.shouldStop && searchType === "both" && mobileSearches > 0) {
            taskController.unregisterContext(context);
            await context.close();
            await performMobileSearch(contextUserDataDir, launchArgs, selectedProfile.name, mobileSearches);
            // Scrape điểm lại sau khi mobile xong để cập nhật mobile count + available
            try {
                const ptsCtx = await chromium.launchPersistentContext(contextUserDataDir, {
                    channel: "msedge",
                    headless: false,
                    userAgent:
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
                    viewport: { width: 1280, height: 720 },
                    ignoreDefaultArgs: ["--enable-automation"],
                    args: launchArgs,
                });
                const ptsPage = await ptsCtx.newPage();
                // Fallback: nếu scraper không lấy được từ flyout, dùng số lượt search thực tế
                await fetchAndEmitPoints(ptsPage, selectedProfile.name, selectedProfile.email, {
                    desktop: `${totalSearched}/${maxSearches}`,
                    mobile: `${mobileSearches}/${mobileSearches}`,
                });
                await ptsCtx.close();
            } catch {
                /* bỏ qua */
            }
            log(`\n<<< HOÀN THÀNH: ${prefix}`);
            return;
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
