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
 * Tự động bấm "Accept" hoặc "Reject" / đóng popup cookie & banner overlay của Bing.
 * Dùng combined selector để check tất cả biến thể cùng lúc, đồng thời ẩn overlay wrapper trong DOM nếu bị che.
 */
export async function dismissCookieConsent(page: Page): Promise<void> {
    try {
        const consentSelectors = [
            '#bnp_btn_accept a',
            '#bnp_btn_accept',
            '#bnp_btn_reject a',
            '#bnp_btn_reject',
            '[data-viewname*="RejectBtn"]',
            '[data-viewname*="AcceptBtn"]',
            '.bnp_overlay_wrapper button',
            '[data-viewname*="OverlayBanner"] button',
            '#bnp_container button',
            'button:has-text("Accept")',
            'button:has-text("Accept all")',
            'button:has-text("Reject")',
            'button:has-text("Reject all")',
            'button:has-text("Refuse")',
            'button:has-text("Chấp nhận")',
            'button:has-text("Tôi đồng ý")',
            'button:has-text("Từ chối")',
        ].join(', ');

        const btn = page.locator(consentSelectors).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btn.click({ force: true }).catch(() => {});
            await sleep(300);
        }

        // Nếu overlay wrapper vẫn tồn tại che phủ màn hình, ẩn/xóa nó khỏi DOM để không chặn pointer events
        await page
            .evaluate(() => {
                const overlays = document.querySelectorAll(
                    '.bnp_overlay_wrapper, #bnp_container, [data-viewname*="OverlayBanner"]'
                );
                overlays.forEach((el) => {
                    if (el) {
                        (el as HTMLElement).style.display = 'none';
                        (el as HTMLElement).style.pointerEvents = 'none';
                    }
                });
            })
            .catch(() => {});
    } catch {
        // Không có popup — bỏ qua
    }
}

/**
 * Gắn handler tự động dismiss cookie consent / overlay khi banner xuất hiện bất cứ lúc nào.
 */
export async function setupCookieConsentHandler(page: Page): Promise<void> {
    try {
        const selector = [
            '#bnp_btn_accept',
            '#bnp_btn_reject',
            '.bnp_overlay_wrapper',
            '[data-viewname*="OverlayBanner"]',
            '#bnp_container',
        ].join(', ');

        await page.addLocatorHandler(page.locator(selector).first(), async () => {
            await dismissCookieConsent(page);
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

