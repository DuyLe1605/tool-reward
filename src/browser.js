/**
 * @fileoverview Các hàm tương tác trực tiếp với giao diện trình duyệt.
 *
 * Đây là module cần cập nhật ĐẦU TIÊN khi Microsoft thay đổi giao diện Bing.
 * Mỗi selector đều được ghi chú rõ để dễ tìm và sửa.
 */

const { sleep } = require("./utils");

/**
 * Tự động bấm "Accept" trên popup đồng ý cookie của Bing.
 *
 * Popup này xuất hiện khi mở Bing lần đầu trong một phiên mới
 * hoặc sau khi xóa cookie. Nếu không dismiss, thanh tìm kiếm bị che.
 *
 * SELECTOR CẦN THEO DÕI:
 *   - Nút Accept:  `button:has-text("Accept")`
 *   - Nếu Microsoft đổi text nút (vd: "Chấp nhận", "I Accept"), sửa selector ở đây.
 *   - Nếu popup dùng shadow DOM, cần thêm `.shadowRoot` vào selector chain.
 *
 * @param {import('playwright').Page} page - Trang Playwright hiện tại.
 * @returns {Promise<void>}
 */
async function dismissCookieConsent(page) {
    try {
        const acceptBtn = page.locator('button:has-text("Accept")').first();
        if (await acceptBtn.isVisible({ timeout: 3000 })) {
            await acceptBtn.click();
            await sleep(1000);
        }
    } catch (e) {}
}

/**
 * Tương tác với nội dung nhiệm vụ dạng Poll hoặc Quiz đơn giản trong tab popup.
 * Click ngẫu nhiên vào một trong các lựa chọn để đánh dấu nhiệm vụ hoàn thành.
 *
 * SELECTOR CẦN THEO DÕI (cập nhật nếu Bing đổi class CSS):
 *   - Poll option:       `.btOption`, `.bt_optionText`, `.bt_optionTile`
 *   - Quiz đơn giản:    `.rq_button`
 *   - Quiz trắc nghiệm: `#rqAnswerOption0` (và các biến thể #rqAnswerOption1, ...)
 *
 * LƯU Ý: Hàm này chỉ xử lý được các dạng quiz/poll đơn giản một bước.
 * Các dạng quiz nhiều bước (Super Quiz, Lightning Quiz) cần logic riêng.
 *
 * @param {import('playwright').Page} page - Tab popup chứa nội dung nhiệm vụ.
 * @returns {Promise<void>}
 */
async function handleActivityContent(page) {
    try {
        const options = await page
            .locator(".btOption, .rq_button, .bt_optionText, #rqAnswerOption0, .bt_optionTile")
            .all();
        if (options.length > 0) {
            console.log("  Đang tương tác với nội dung (Poll/Quiz)...");
            await options[Math.floor(Math.random() * options.length)].click().catch(() => {});
            await sleep(2000);
        }
    } catch (e) {}
}

module.exports = { dismissCookieConsent, handleActivityContent };
