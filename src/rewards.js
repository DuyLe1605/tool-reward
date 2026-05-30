/**
 * @fileoverview Xử lý các nhiệm vụ hàng ngày trên trang Bing Rewards.
 *
 * ĐÂY LÀ MODULE CẦN CẬP NHẬT THƯỜNG XUYÊN NHẤT khi Microsoft thay đổi
 * giao diện trang rewards.bing.com.
 *
 * ============================================================
 * CẤU TRÚC GIAO DIỆN TRANG REWARDS (tính đến tháng 5/2026)
 * ============================================================
 *
 * 1. BANNER "Daily Set Streak"
 *    - Một banner/button ở đầu trang, click vào để mở flyout (dialog).
 *    - Selector: `text="Daily Set Streak"` hoặc `button.rounded-cornerCardDefault`
 *      filter hasText /Daily Set Streak/i
 *
 * 2. FLYOUT (Dialog) — Daily Set
 *    - Một dialog overlay hiện ra sau khi click banner.
 *    - Chứa 3 nhiệm vụ Daily Set (thường là quiz/poll/search nhỏ).
 *    - Selector dialog: `section[role="dialog"]`, `[role="dialog"]`, `.bg-flyout`
 *    - Nút đóng: `button[aria-label="Close"]` hoặc `button:has-text("Close")`
 *
 * 3. KHU VỰC "Keep Earning" / More Activities
 *    - Khu vực nhiệm vụ thường ngày bên dưới Daily Set.
 *    - Selector: `section#moreactivities`
 *
 * 4. NÚT "Show more"
 *    - Ẩn các nhiệm vụ ít phổ biến hơn. Cần click để hiện ra.
 *    - Selector: `button:has-text("Show more")`
 *
 * ============================================================
 * TRẠNG THÁI CỦA MỖI CARD NHIỆM VỤ
 * ============================================================
 *
 * - Đã hoàn thành: class `bg-statusSuccessRewardsBg` hoặc icon `mee-icon-CheckMark`
 *                  hoặc text "completed" / "đã hoàn thành"
 * - Bị khóa:       `aria-disabled="true"` hoặc `data-disabled="true"`
 * - Bỏ qua:        quest, punch card, check-in, bing app, redeem, search bar
 *                  (các loại này không thể tự động hóa hoàn toàn)
 */

const { CONFIG } = require("./config");
const { sleep } = require("./utils");
const { handleActivityContent } = require("./browser");

/**
 * Quét và xử lý tất cả card nhiệm vụ trong một vùng DOM cụ thể.
 *
 * Logic lọc card:
 *   1. Bỏ qua card đã hoàn thành (có icon check hoặc class success)
 *   2. Bỏ qua card bị khóa (aria-disabled)
 *   3. Bỏ qua các loại nhiệm vụ trong danh sách skipKeywords
 *   4. Chỉ xử lý card có điểm thưởng (chứa "+", "pts" hoặc số)
 *   5. Click card → chờ popup → tương tác nội dung → đóng popup
 *
 * SELECTOR CẦN THEO DÕI:
 *   - Card nhiệm vụ:    `.rounded-cornerCardDefault`, `a[href*="search"]`, `a[href*="quiz"]`
 *   - Completed class:  `bg-statusSuccessRewardsBg`
 *   - Completed icon:   `mee-icon-CheckMark`
 *
 * @param {import('playwright').Page}    page             - Trang rewards đang mở.
 * @param {import('playwright').Locator} containerLocator - Vùng DOM cần quét (flyout hoặc moreactivities).
 * @param {string}                       label            - Tên hiển thị để log debug.
 * @returns {Promise<void>}
 */
async function processContainer(page, containerLocator, label) {
    if ((await containerLocator.count()) === 0) return;

    await containerLocator.scrollIntoViewIfNeeded().catch(() => {});
    const cards = await containerLocator
        .locator('.rounded-cornerCardDefault, a[href*="search"], a[href*="quiz"]')
        .all();

    console.log(`--- Đang quét: ${label} (${cards.length} mục) ---`);

    for (const card of cards) {
        try {
            const cardHtml = await card.innerHTML();
            const cardText = (await card.innerText()).toLowerCase().replace(/\s+/g, " ");
            const href = (await card.getAttribute("href")) || "";
            const title = cardText.split("\n")[0].substring(0, 40).trim();

            // Bỏ qua banner tổng hợp (không phải nhiệm vụ đơn lẻ)
            if ((cardText.includes("daily set streak") || cardText.includes("keep earning")) && label !== "Bảng Flyout")
                continue;

            // Bỏ qua nhiệm vụ đã hoàn thành
            const isCompleted =
                cardHtml.includes("bg-statusSuccessRewardsBg") ||
                cardHtml.includes("mee-icon-CheckMark") ||
                cardText.includes("completed") ||
                cardText.includes("đã hoàn thành");
            if (isCompleted) continue;

            // Bỏ qua nhiệm vụ đang bị khóa
            const isDisabled =
                (await card.getAttribute("aria-disabled")) === "true" ||
                (await card.getAttribute("data-disabled")) === "true";
            if (isDisabled) continue;

            // Bỏ qua các loại nhiệm vụ không hỗ trợ tự động hóa
            // Cập nhật danh sách này nếu Microsoft thêm loại nhiệm vụ mới không tự động được
            const skipKeywords = [
                "quest",
                "expires",
                "punch card",
                "tháng 5",
                "may highlights",
                "check-in",
                "bing app",
                "redeem",
                "search bar",
            ];
            if (
                skipKeywords.some((k) => cardText.includes(k)) ||
                href.includes("/quest/") ||
                href.includes("ux=searchbar")
            )
                continue;

            // Chỉ xử lý card có điểm thưởng rõ ràng
            if (!cardText.includes("+") && !cardText.includes("pts") && !/\d+/.test(cardText)) continue;

            console.log(`- Đang xử lý: "${title}"`);
            await card.scrollIntoViewIfNeeded().catch(() => {});

            const [popup] = await Promise.all([
                page.waitForEvent("popup", { timeout: 8000 }).catch(() => null),
                card.click({ force: true }).catch(() => {}),
            ]);

            if (popup) {
                await popup.waitForLoadState("load");
                await sleep(5000);
                await handleActivityContent(popup);
                await popup.close();
            }
            await sleep(2000);
        } catch (e) {}
    }
}

/**
 * Điều hướng đến trang Rewards và hoàn thành tất cả nhiệm vụ có thể tự động hóa.
 *
 * THỨ TỰ XỬ LÝ:
 *   1. Goto rewards.bing.com/earn
 *   2. Tìm và mở flyout "Daily Set Streak" (nếu chưa mở)
 *   3. Xử lý tất cả card bên trong flyout
 *   4. Đóng flyout
 *   5. Xử lý khu vực "Keep Earning" (section#moreactivities)
 *   6. Click "Show more" nếu có để lộ thêm nhiệm vụ ẩn
 *
 * @param {import('playwright').Page} page - Trang trình duyệt đang chạy.
 * @returns {Promise<void>}
 */
async function completeRewardsActivities(page) {
    console.log("\n--- ĐANG XỬ LÝ CÁC NHIỆM VỤ REWARDS ---");
    try {
        await page.goto(CONFIG.rewardsUrl, { waitUntil: "domcontentloaded" });
        await sleep(5000);

        // Mở flyout Daily Set Streak bằng cách click text header
        console.log("Đang tìm và mở bảng Daily Set Streak...");
        const dailySetHeader = page.locator('text="Daily Set Streak"').first();
        if (await dailySetHeader.isVisible()) {
            await dailySetHeader.click();
            await sleep(3000);
        }

        // Fallback: click button nếu aria-expanded chưa true
        const dailySetBtn = page
            .locator("button, .rounded-cornerCardDefault")
            .filter({ hasText: /Daily Set Streak/i })
            .first();
        if ((await dailySetBtn.count()) > 0) {
            const isExpanded = (await dailySetBtn.getAttribute("aria-expanded")) === "true";
            if (!isExpanded) {
                console.log("Đang mở bảng Daily Set Streak...");
                await dailySetBtn.click({ force: true }).catch(() => {});
                await page
                    .waitForSelector('section[role="dialog"], [role="dialog"]', { state: "visible", timeout: 5000 })
                    .catch(() => {});
                await sleep(2000);
            }
        }

        // BƯỚC 1: Xử lý Flyout Daily Set
        const flyout = page.locator('section[role="dialog"], [role="dialog"], .bg-flyout').first();
        if (await flyout.isVisible()) {
            await processContainer(page, flyout, "Bảng Flyout");
            console.log("Đóng bảng Daily Set...");
            const closeBtn = flyout.locator('button[aria-label="Close"], button:has-text("Close")').first();
            if (await closeBtn.isVisible()) await closeBtn.click().catch(() => {});
            else await page.keyboard.press("Escape");
            await sleep(2000);
        }

        // BƯỚC 2: Xử lý Keep Earning (section#moreactivities)
        const moreActivities = page.locator("section#moreactivities").first();
        if ((await moreActivities.count()) > 0) {
            await processContainer(page, moreActivities, "Khu vực Keep Earning");
        }

        // Bước 3: Hiện thêm nhiệm vụ nếu có nút "Show more"
        const showMoreBtn = page.locator('button:has-text("Show more")').first();
        if (await showMoreBtn.isVisible()) {
            console.log('Đang click "Show more" để hiện thêm nhiệm vụ...');
            await showMoreBtn.click().catch(() => {});
            await sleep(3000);
        }

        console.log("\n--- HOÀN THÀNH ---");
    } catch (err) {
        console.error(`Lỗi tổng thể Rewards: ${err.message}`);
    }
}

module.exports = { completeRewardsActivities };
