/**
 * @fileoverview Tương tác trực tiếp với giao diện trình duyệt.
 *
 * ĐÂY LÀ MODULE CẦN CẬP NHẬT ĐẦU TIÊN khi Microsoft thay đổi giao diện Bing.
 *
 * SELECTOR CẦN THEO DÕI:
 *   - Cookie consent: `button:has-text("Accept")`
 *   - Poll option:    `.btOption`, `.bt_optionText`, `.bt_optionTile`
 *   - Quiz button:    `.rq_button`, `#rqAnswerOption0`
 */

import type { Page } from "playwright";
import { sleep } from "./utils";
import { log } from "./logger";

/**
 * Tự động bấm "Accept" trên popup cookie của Bing.
 * Dùng combined selector để check tất cả biến thể cùng lúc (desktop + mobile).
 */
export async function dismissCookieConsent(page: Page): Promise<void> {
    try {
        // Desktop: #bnp_btn_accept (div bọc hoặc thẻ a bên trong)
        // Mobile:  button full-width có text "Accept" (dialog mới của Bing)
        const btn = page
            .locator('#bnp_btn_accept a, #bnp_btn_accept, button:has-text("Accept"), button:has-text("Accept all")')
            .first();
        if (await btn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await btn.click().catch(() => {});
            await sleep(500);
        }
    } catch {
        // Không có popup — bỏ qua
    }
}

/**
 * Gắn handler tự động dismiss cookie consent khi popup xuất hiện bất cứ lúc nào.
 * Dùng nút Accept làm trigger — khi nó visible thì click luôn.
 */
export async function setupCookieConsentHandler(page: Page): Promise<void> {
    try {
        // Dùng chính nút Accept làm locator — khi nó xuất hiện thì handler được gọi
        await page.addLocatorHandler(page.locator("#bnp_btn_accept").first(), async (btn) => {
            await btn.click().catch(() => {});
            await sleep(300);
        });
    } catch {
        // addLocatorHandler không khả dụng — bỏ qua
    }
}

/**
 * Tương tác với nội dung quiz/poll đơn giản trong tab popup.
 * Click ngẫu nhiên vào một lựa chọn để đánh dấu nhiệm vụ hoàn thành.
 *
 * Chỉ hỗ trợ quiz/poll một bước. Quiz nhiều bước cần logic riêng.
 */
export async function handleActivityContent(page: Page): Promise<void> {
    try {
        const options = await page
            .locator(".btOption, .rq_button, .bt_optionText, #rqAnswerOption0, .bt_optionTile")
            .all();
        if (options.length > 0) {
            log("  Đang tương tác với nội dung (Poll/Quiz)...");
            await options[Math.floor(Math.random() * options.length)].click().catch(() => {});
            await sleep(2000);
        }
    } catch {
        // Quiz/poll không load được — bỏ qua
    }
}

/**
 * Điều hướng trang với cơ chế thử lại khi gặp lỗi mạng tạm thời.
 */
export async function gotoWithRetry(
    page: Page,
    url: string,
    prefix = "",
    timeout = 20000,
    attempts = 3,
): Promise<boolean> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout });
            return true;
        } catch (err) {
            const msg = (err as Error).message;
            if (
                attempt < attempts &&
                (msg.includes("ERR_NETWORK") || msg.includes("ERR_CONNECTION") || msg.includes("net::"))
            ) {
                log(`${prefix}⚠️  Lỗi mạng khi vào ${url} (lần ${attempt}/${attempts}), thử lại sau 3s...`);
                await sleep(3000);
            } else {
                throw err;
            }
        }
    }
    return false;
}

