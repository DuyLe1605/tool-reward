/**
 * @fileoverview Scrape dữ liệu điểm thưởng từ trang Rewards bằng DOM selector.
 *
 * Dựa trên cấu trúc HTML thực tế của flyout "Points breakdown":
 *   - Tiêu đề h2 "Points breakdown" là container gốc
 *   - Số điểm hôm nay: element có class *pageHeader*
 *   - Desktop/Mobile: <p>LABEL</p> → parentDiv.nextSibling → <span>N</span><span>/M</span>
 *   - History: leaf <div>LABEL</div> → nextSibling → <div>VALUE</div>
 */

import type { Page } from "playwright";
import { sleep } from "./utils";
import type { PointsSummary } from "./logger";

/**
 * Scrape điểm thưởng từ trang Rewards.
 * Tự động mở flyout "Points breakdown" nếu tìm thấy nút.
 */
export async function scrapeRewardsPoints(page: Page): Promise<PointsSummary | null> {
    try {
        // Mở flyout "Points breakdown"
        const breakdownBtn = page.locator('button:has-text("Points breakdown")').first();
        if (await breakdownBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await breakdownBtn.click().catch(() => {});
            // Đợi dialog xuất hiện (có h2 "Points breakdown" bên trong)
            await page
                .waitForSelector('[role="dialog"] h2, section[role="dialog"]', {
                    state: "visible",
                    timeout: 6000,
                })
                .catch(() => {});
            await sleep(1200);
        }

        const data = (await page.evaluate(() => {
            function parseNum(s: string): number {
                return parseInt(s.replace(/,/g, ""), 10) || 0;
            }

            // Điểm hôm nay: element có class chứa "pageHeader"
            let today = 0;
            for (const el of document.querySelectorAll("[class*='pageHeader']")) {
                const n = parseNum(el.textContent?.trim() ?? "");
                if (n > 0) {
                    today = n;
                    break;
                }
            }

            // Tìm grid chứa bảng activity bằng cách dùng "Desktop Bing search" làm anchor.
            // Cấu trúc: grid > span | div>p(LABEL) | div(VALUE) | span
            // Walk up từ <p> đến grid container có inline style gridTemplateColumns.
            let activityGrid: Element | null = null;
            for (const p of document.querySelectorAll("p")) {
                if (p.textContent?.trim() === "Desktop Bing search") {
                    let el: Element | null = p;
                    while (el) {
                        if ((el as HTMLElement).style?.gridTemplateColumns) {
                            activityGrid = el;
                            break;
                        }
                        el = el.parentElement;
                    }
                    break;
                }
            }

            let desktop = "", mobile = "", offers = 0;
            if (activityGrid) {
                for (const p of activityGrid.querySelectorAll("p")) {
                    const label = p.textContent?.trim() ?? "";
                    const valueDiv = p.parentElement?.nextElementSibling;
                    if (!valueDiv) continue;
                    if (label === "Desktop Bing search" || label === "Mobile Bing search") {
                        const spans = valueDiv.querySelectorAll("span");
                        const val =
                            spans.length >= 2
                                ? (spans[0].textContent ?? "") + (spans[1].textContent ?? "")
                                : valueDiv.textContent?.trim() ?? "";
                        if (label === "Desktop Bing search") desktop = val;
                        else mobile = val;
                    } else if (label === "Offers") {
                        offers = parseNum(valueDiv.textContent?.trim() ?? "");
                    }
                }
            }

            // History rows — tìm trong toàn trang (leaf div pattern)
            let lifetime = 0, thisMonth = 0, thisYear = 0;
            for (const div of document.querySelectorAll("div")) {
                if (div.childElementCount !== 0) continue;
                const txt = div.textContent?.trim() ?? "";
                const val = parseNum(div.nextElementSibling?.textContent?.trim() ?? "");
                if (txt === "Lifetime") lifetime = val;
                else if (txt === "This month") thisMonth = val;
                else if (txt === "This year") thisYear = val;
            }

            return { today, desktop, mobile, offers, lifetime, thisMonth, thisYear };
        })) as PointsSummary;

        // Bỏ qua nếu không scrape được gì có ý nghĩa
        if (!data.today && !data.desktop && !data.mobile && !data.lifetime) return null;
        return data;
    } catch {
        return null;
    }
}
