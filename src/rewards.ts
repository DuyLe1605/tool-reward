/**
 * @fileoverview Xử lý các nhiệm vụ hàng ngày trên trang Bing Rewards.
 *
 * ĐÂY LÀ MODULE CẦN CẬP NHẬT THƯỜNG XUYÊN NHẤT khi Microsoft thay đổi giao diện.
 */

import type { Page, Locator } from "playwright";
import { CONFIG } from "./config";
import { sleep } from "./utils";
import { log, emitPoints } from "./logger";
import { handleActivityContent, gotoWithRetry } from "./browser";
import { scrapeRewardsPoints, scrapeAvailablePoints, fetchAndEmitPoints } from "./pointsScraper";

/** Kiểm tra đăng nhập: false nếu bị redirect sang login page hoặc trang 404/Sign-in. */
async function isLoggedIn(page: Page): Promise<boolean> {
    const url = page.url();
    if (url.includes("login.microsoftonline") || url.includes("login.live") || url.includes("login.microsoft"))
        return false;
    const emailInput = page.locator('input[type="email"], #i0116');
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) return false;
    // Nếu trang rewards hiện nút "Sign in" → chưa đăng nhập
    const signInBtn = page.locator('a[href*="/auth"], a[href*="login"], a:has-text("Sign in")').first();
    if (await signInBtn.isVisible({ timeout: 1500 }).catch(() => false)) return false;
    return true;
}

/**
 * Click card và xử lý: popup tab mới hoặc same-tab navigation.
 */
async function handleCardClick(page: Page, card: Locator): Promise<void> {
    const currentUrl = page.url();

    const [popup] = await Promise.all([
        page.waitForEvent("popup", { timeout: 5000 }).catch(() => null),
        card.click({ force: true }).catch(() => {}),
    ]);

    if (popup) {
        await popup.waitForLoadState("load").catch(() => {});
        await sleep(3000);
        await handleActivityContent(popup);
        await sleep(2000);
        await popup.close().catch(() => {});
        return;
    }

    // Same-tab navigation?
    await sleep(2000);
    if (page.url() !== currentUrl) {
        await sleep(3000);
        await handleActivityContent(page);
        await sleep(2000);
        await page.goto(CONFIG.rewardsUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        await sleep(3000);
    }
}

/**
 * Quét và xử lý tất cả card nhiệm vụ trong một container.
 */
async function processContainer(page: Page, containerLocator: Locator, label: string, profileName = ""): Promise<void> {
    const prefix = profileName ? `[${profileName}] ` : "";
    if ((await containerLocator.count()) === 0) return;
    await containerLocator.scrollIntoViewIfNeeded().catch(() => {});

    const cards = await containerLocator.locator('[data-react-aria-pressable="true"]').all();

    log(`${prefix}--- Quét: ${label} (${cards.length} mục) ---`);

    for (const card of cards) {
        try {
            const cardHtml = await card.innerHTML().catch(() => "");
            const cardText = (await card.innerText().catch(() => "")).toLowerCase().replace(/\s+/g, " ");
            const href = (await card.getAttribute("href").catch(() => "")) ?? "";
            const title = cardText.split("\n")[0].substring(0, 50).trim();

            if ((cardText.includes("daily set streak") || cardText.includes("keep earning")) && label !== "Bảng Flyout")
                continue;

            const isCompleted =
                cardHtml.includes("bg-statusSuccessRewardsBg") ||
                cardHtml.includes("mee-icon-CheckMark") ||
                cardText.includes("completed");
            if (isCompleted) {
                log(`${prefix}  [done] "${title}"`);
                continue;
            }

            const isDisabled =
                (await card.getAttribute("aria-disabled").catch(() => null)) === "true" ||
                (await card.getAttribute("data-disabled").catch(() => null)) === "true";
            if (isDisabled) {
                log(`${prefix}  [locked] "${title}"`);
                continue;
            }

            const skipTypes = [
                "quest",
                "punch card",
                "check-in",
                "bing app",
                "redeem",
                "search bar",
                "expires soon",
                "silver level",
                "gold level",
                "level required",
            ];
            if (
                skipTypes.some((k) => cardText.includes(k)) ||
                href.includes("/quest/") ||
                href.includes("ux=searchbar") ||
                href.includes("levelbenefitexclusive")
            ) {
                log(`${prefix}  [skip] "${title}"`);
                continue;
            }

            // Chỉ xử lý card có điểm chưa claim (badge xanh +N)
            const hasClaimablePoints = cardHtml.includes("bg-statusInformativeTintBg");
            if (!hasClaimablePoints) continue;

            log(`${prefix}  → "${title}"`);
            await card.scrollIntoViewIfNeeded().catch(() => {});
            await handleCardClick(page, card);
        } catch (err) {
            log(`${prefix}  Lỗi card: ${(err as Error).message}`);
        }
    }
}

/**
 * Claim pending points từ nút "Ready to claim" trên dashboard.
 *
 * Flow:
 *   1. Tìm nút "Ready to claim" trên dashboard (có số điểm đang pending)
 *   2. Click để mở flyout dialog "Claim points"
 *   3. Trong dialog, click nút "Claim points" (brand button)
 *   4. Đóng dialog — bỏ qua "Earn more points"
 */
async function claimPendingPoints(page: Page, profileName = ""): Promise<void> {
    const prefix = profileName ? `[${profileName}] ` : "";
    try {
        log(`${prefix}Kiểm tra điểm Ready to claim...`);
        // "Ready to claim" chỉ xuất hiện ở dashboard, không phải trang /earn.
        const loaded = await gotoWithRetry(page, "https://rewards.bing.com/", prefix).catch(() => false);
        if (!loaded) return;

        await sleep(1500);
        await page.waitForURL("**/dashboard**", { timeout: 15000 }).catch(() => {});
        await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
        await sleep(2000);

        // Selector robust cho nút Ready to claim (hỗ trợ tiếng Anh + Việt)
        const claimTrigger = page.locator('button, [data-react-aria-pressable="true"]')
            .filter({ hasText: /Ready to claim|Sẵn sàng nhận/i })
            .first();

        // Chờ trigger xuất hiện trong 10s
        const isVisible = await claimTrigger.isVisible({ timeout: 10000 }).catch(() => false);
        if (!isVisible) {
            log(`${prefix}Không tìm thấy hoặc không có điểm pending cần claim.`);
            return;
        }

        log(`${prefix}Đang mở flyout để claim điểm pending...`);
        try {
            await claimTrigger.scrollIntoViewIfNeeded().catch(() => {});
            await claimTrigger.click({ timeout: 5000 });
        } catch (clickErr) {
            log(`${prefix}⚠️  Lỗi khi click Ready to claim (thử lại với force): ${(clickErr as Error).message}`);
            await claimTrigger.click({ force: true }).catch(() => {});
        }

        // Chờ flyout dialog "Claim points" xuất hiện (hỗ trợ tiếng Anh + Việt)
        const dialog = page.locator('section[role="dialog"]').filter({ hasText: /claim points/i }).first();
        const dialogVisible = await dialog.waitFor({ state: "visible", timeout: 10000 }).then(
            () => true,
            () => false,
        );
        if (!dialogVisible) {
            log(`${prefix}⚠️  Không mở được flyout Claim points.`);
            return;
        }
        await sleep(2000);

        // Check xem có nút "Earn more points" / "Kiếm thêm điểm" không (đã nhận trước đó)
        const earnedMoreBtn = dialog.getByRole("link", { name: /earn more points|kiếm thêm điểm/i }).first();
        if (await earnedMoreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            log(`${prefix}Điểm pending đã được claim trước đó.`);
            const closeBtn = dialog.locator('button[aria-label="Close"], button[aria-label="Đóng"], button:has-text("Close"), button:has-text("Đóng")').first();
            if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await closeBtn.click().catch(() => {});
            } else {
                await page.keyboard.press("Escape").catch(() => {});
            }
            await sleep(1000);
            return;
        }

        // Click nút "Claim points" trong dialog (hỗ trợ tiếng Anh + Việt)
        const claimBtn = dialog.locator('button').filter({ hasText: /^(claim points|nhận điểm)$/i }).first();

        if (await claimBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            try {
                await claimBtn.scrollIntoViewIfNeeded().catch(() => {});
                await claimBtn.click({ timeout: 5000 });
                log(`${prefix}✅ Đã click nút Claim points.`);
            } catch (clickErr) {
                log(`${prefix}⚠️  Lỗi khi click nút Claim points (thử lại với force): ${(clickErr as Error).message}`);
                await claimBtn.click({ force: true }).catch(() => {});
                log(`${prefix}✅ Đã click nút Claim points (force).`);
            }

            // Chờ cho nút đổi sang "Earn more points" / "Kiếm thêm điểm" hoặc dialog tự đóng
            await Promise.race([
                dialog.getByRole("link", { name: /earn more points|kiếm thêm điểm/i }).waitFor({ state: "visible", timeout: 8000 }),
                dialog.waitFor({ state: "hidden", timeout: 8000 }),
            ]).catch(() => {});
            await sleep(2000);
        } else {
            log(`${prefix}⚠️  Không tìm thấy nút Claim points trong dialog.`);
        }

        // Đóng dialog
        const closeBtn = dialog.locator('button[aria-label="Close"], button[aria-label="Đóng"], button:has-text("Close"), button:has-text("Đóng")').first();
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeBtn.click().catch(() => {});
        } else {
            await page.keyboard.press("Escape").catch(() => {});
        }
        await sleep(1000);
    } catch (err) {
        log(`${prefix}⚠️  Lỗi khi claim điểm: ${(err as Error).message}`);
    }
}

/**
 * Điều hướng đến trang Rewards và hoàn thành tất cả nhiệm vụ có thể tự động hóa.
 */
export async function completeRewardsActivities(page: Page, profileName = "", profileEmail = ""): Promise<void> {
    const prefix = profileName ? `[${profileName}] ` : "";
    log(`\n${prefix}--- ĐANG XỬ LÝ CÁC NHIỆM VỤ REWARDS ---`);
    try {
        // Warm-up: vào rewards.bing.com/ trước để trigger auth cookie, đợi redirect sang dashboard
        log(`${prefix}Warm-up auth Rewards...`);
        const warmupLoaded = await gotoWithRetry(page, "https://rewards.bing.com/", prefix, 15000).catch(() => false);
        if (!warmupLoaded) return;
        await sleep(1500);
        await page.waitForURL("**/dashboard**", { timeout: 8000 }).catch(() => {});
        await sleep(2000);
        log(`${prefix}  → URL sau warm-up: ${page.url()}`);

        // Retry goto khi gặp lỗi mạng thoáng qua (ERR_NETWORK_CHANGED, ERR_CONNECTION_RESET...)
        const loaded = await gotoWithRetry(page, CONFIG.rewardsUrl, prefix).catch(() => false);
        if (!loaded) return;
        await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
        await sleep(2000);

        if (!(await isLoggedIn(page))) {
            log(`${prefix}⚠️  Chưa đăng nhập vào Rewards (URL: ${page.url()}) — bỏ qua.`);
            return;
        }

        // ── Daily Set Streak flyout ──────────────────────────────────────────
        log(`${prefix}Đang mở Daily Set Streak...`);
        const dailySetBtn = page
            .locator('button, a, [data-react-aria-pressable="true"]')
            .filter({ hasText: /Daily Set Streak/i })
            .first();

        if (await dailySetBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
            const expanded = (await dailySetBtn.getAttribute("aria-expanded").catch(() => null)) === "true";
            if (!expanded) {
                log(`${prefix}  Click mở Daily Set Streak flyout...`);
                await dailySetBtn.click({ force: true }).catch(() => {});
                await page
                    .waitForSelector('section[role="dialog"], [role="dialog"], .bg-flyout', { state: "visible", timeout: 8000 })
                    .catch(() => {});
                await sleep(2000);
            } else {
                log(`${prefix}  Daily Set Streak đã được mở sẵn.`);
            }
        } else {
            log(`${prefix}  ⚠️ Không tìm thấy thẻ Daily Set Streak.`);
        }

        const flyout = page.locator('section[role="dialog"], [role="dialog"], .bg-flyout').first();
        if (await flyout.isVisible({ timeout: 2000 }).catch(() => false)) {
            await processContainer(page, flyout, "Bảng Flyout", profileName);
            const closeBtn = flyout.locator('button[aria-label="Close"], button:has-text("Close")').first();
            if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
            else await page.keyboard.press("Escape");
            await sleep(2000);
        } else {
            log(`${prefix}Không tìm thấy flyout Daily Set.`);
        }

        // ── Keep Earning ─────────────────────────────────────────────────────
        const moreActivities = page.locator("section#moreactivities").first();
        if ((await moreActivities.count()) > 0) {
            await processContainer(page, moreActivities, "Keep Earning", profileName);
        } else {
            log(`${prefix}Không tìm thấy section#moreactivities.`);
        }

        // ── Show more → quét thêm ────────────────────────────────────────────
        const showMoreBtn = page.locator('button:has-text("Show more")').first();
        if (await showMoreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            log(`${prefix}Click "Show more"...`);
            await showMoreBtn.click().catch(() => {});
            await sleep(3000);
            if ((await moreActivities.count()) > 0) {
                await processContainer(page, moreActivities, "Keep Earning (Show more)", profileName);
            }
        }

        log(`\n${prefix}--- HOÀN THÀNH REWARDS ---`);

        // ── Claim pending points ──────────────────────────────────────────────
        await claimPendingPoints(page, profileName);

        // Scrape điểm sau khi hoàn thành tất cả tasks
        if (profileName) {
            await fetchAndEmitPoints(page, profileName, profileEmail);
        }
    } catch (err) {
        log(`${prefix}Lỗi Rewards: ${(err as Error).message}`);
    }
}
