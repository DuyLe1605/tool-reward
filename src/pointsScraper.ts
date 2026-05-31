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
import { log, emitPoints } from "./logger";

/**
 * Scrape "Available points" từ trang dashboard (rewards.bing.com/dashboard).
 * Gọi khi page đang ở trên dashboard — trước khi navigate sang /earn.
 */
export async function scrapeAvailablePoints(page: Page): Promise<number> {
    return page
        .evaluate(() => {
            function parseNum(s: string) {
                return parseInt(s.replace(/,/g, ""), 10) || 0;
            }
            for (const el of document.querySelectorAll("p")) {
                if (el.textContent?.trim() === "Available points") {
                    const cardBody = el.parentElement?.parentElement;
                    if (cardBody) {
                        const valueEl = cardBody.querySelector("[class*='pageHeader']");
                        if (valueEl) return parseNum(valueEl.textContent?.trim() ?? "");
                    }
                }
            }
            return 0;
        })
        .catch(() => 0);
}

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

            // Scoped vào dialog để tránh bắt nhầm element ngoài flyout
            const dialog = document.querySelector<Element>('[role="dialog"]');
            const scope = dialog ?? document;

            // Điểm hôm nay: <p class="grow text-pageHeader">N</p> bên trong dialog
            let today = 0;
            let todayFound = false;
            for (const el of scope.querySelectorAll("[class*='pageHeader']")) {
                const txt = el.textContent?.trim() ?? "";
                if (txt !== "") {
                    today = parseNum(txt);
                    todayFound = true;
                    break;
                }
            }

            // Tìm grid chứa bảng activity bằng cách dùng "Desktop Bing search" làm anchor.
            // Cấu trúc: grid > span | div>p(LABEL) | div(VALUE) | span
            // Walk up từ <p> đến grid container có inline style gridTemplateColumns.
            let activityGrid: Element | null = null;
            for (const p of scope.querySelectorAll("p")) {
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

            let desktop = "",
                mobile = "",
                offers = 0;
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
                                : (valueDiv.textContent?.trim() ?? "");
                        if (label === "Desktop Bing search") desktop = val;
                        else mobile = val;
                    } else if (label === "Offers") {
                        offers = parseNum(valueDiv.textContent?.trim() ?? "");
                    }
                }
            }

            // History rows — tìm trong scope (dialog hoặc toàn trang)
            let lifetime = 0,
                thisMonth = 0,
                thisYear = 0;
            for (const div of scope.querySelectorAll("div")) {
                if (div.childElementCount !== 0) continue;
                const txt = div.textContent?.trim() ?? "";
                const val = parseNum(div.nextElementSibling?.textContent?.trim() ?? "");
                if (txt === "Lifetime") lifetime = val;
                else if (txt === "This month") thisMonth = val;
                else if (txt === "This year") thisYear = val;
            }

            return { today, todayFound, desktop, mobile, offers, lifetime, thisMonth, thisYear };
        })) as Omit<PointsSummary, "available"> & { todayFound: boolean };

        // Bỏ qua nếu không scrape được gì có ý nghĩa
        if (!data.todayFound && !data.desktop && !data.mobile && !data.lifetime) return null;
        const { todayFound: _f, ...rest } = data;
        return { ...rest, available: 0 } as PointsSummary;
    } catch {
        return null;
    }
}

/**
 * Pipeline đầy đủ: dashboard → lấy available → /earn → scrape breakdown → merge → emitPoints.
 * Dùng khi page đang ở BẤT KỲ trang nào của rewards.bing.com và đã đăng nhập.
 */
export async function fetchAndEmitPoints(page: Page, profileName: string): Promise<void> {
    try {
        log(`[${profileName}] Đang cập nhật điểm...`);
        await page.goto("https://rewards.bing.com/", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        await page.waitForURL("**/dashboard**", { timeout: 8000 }).catch(() => {});
        await sleep(1500);
        const available = await scrapeAvailablePoints(page);
        await page
            .goto("https://rewards.bing.com/earn", { waitUntil: "domcontentloaded", timeout: 15000 })
            .catch(() => {});
        await sleep(2000);
        const pts = await scrapeRewardsPoints(page);
        if (pts) {
            pts.available = available;
            emitPoints(profileName, pts);
            log(
                `[${profileName}] Điểm: hôm nay=${pts.today} | desktop=${pts.desktop || "?"} | mobile=${pts.mobile || "?"} | khả dụng=${available}`,
            );
        }
    } catch (err) {
        log(`[${profileName}] Lỗi cập nhật điểm: ${(err as Error).message}`);
    }
}
