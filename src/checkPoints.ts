/**
 * @fileoverview Kiểm tra điểm thưởng của các profile mà không thực hiện search.
 *
 * Dùng cho nút "Kiểm tra điểm" trên Web UI — mở từng profile, vào trang Rewards,
 * scrape điểm, đóng trình duyệt. Không tìm kiếm, không làm nhiệm vụ.
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import os from "os";
import { CONFIG } from "./config";
import { sleep, copyDirRecursive } from "./utils";
import { dismissCookieConsent } from "./browser";
import { log, emitPoints } from "./logger";
import { taskController } from "./taskController";
import type { EdgeProfile } from "./profiles";
import { fetchAndEmitPoints } from "./pointsScraper";

/** Scrape điểm thưởng từ trang Rewards.
 * Được xử lý bởi pointsScraper.ts — dùng DOM-based approach.
 */
export async function checkProfilePoints(profile: EdgeProfile): Promise<void> {
    const prefix = `[${profile.name}]`;
    log(`${prefix} Đang kiểm tra điểm...`);

    let tempDir: string | null = null;
    try {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "reward-pts-"));
        const srcProfile = path.join(CONFIG.userDataDir, profile.folder);
        const destProfile = path.join(tempDir, "Default");
        await copyDirRecursive(srcProfile, destProfile);

        const cookiesOk =
            fs.existsSync(path.join(destProfile, "Cookies")) ||
            fs.existsSync(path.join(destProfile, "Network", "Cookies"));
        if (!cookiesOk) {
            log(`${prefix} ⚠️  Cookies bị bỏ qua — profile có thể đang mở trong Edge.`);
        }

        const context = await chromium.launchPersistentContext(tempDir, {
            channel: "msedge",
            headless: false,
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
            viewport: { width: 1280, height: 720 },
            ignoreDefaultArgs: ["--enable-automation"],
            args: [
                "--profile-directory=Default",
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars",
            ],
        });

        try {
            const page = await context.newPage();

            await page.addInitScript(() => {
                Object.defineProperty(navigator, "webdriver", { get: () => undefined });
                (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
            });

            // Vào rewards.bing.com/ → đợi auth redirect → dashboard (warm-up auth)
            await page
                .goto("https://rewards.bing.com/", { waitUntil: "domcontentloaded", timeout: 20000 })
                .catch(() => {});
            await dismissCookieConsent(page).catch(() => {});
            await sleep(1500);
            await page.waitForURL("**/dashboard**", { timeout: 10000 }).catch(() => {});
            await sleep(1500);

            const url = page.url();
            if (
                url.includes("login.microsoftonline") ||
                url.includes("login.live") ||
                url.includes("login.microsoft")
            ) {
                log(`${prefix} ⚠️  Chưa đăng nhập — bỏ qua.`);
                return;
            }

            // Scrape điểm
            await fetchAndEmitPoints(page, profile.name);
        } finally {
            await context.close().catch(() => {});
        }
    } finally {
        if (tempDir) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {
                /* ignore cleanup error */
            }
        }
    }
}

/** Kiểm tra điểm cho nhiều profile — chạy lần lượt, có thể dừng giữa chừng. */
export async function checkPointsForProfiles(profiles: EdgeProfile[]): Promise<void> {
    const eligible = profiles.filter((p) => p.email?.trim());
    log(`\n=== BẮT ĐẦU KIỂM TRA ĐIỂM (${eligible.length}/${profiles.length} profile có email) ===`);
    for (const profile of eligible) {
        if (taskController.shouldStop) break;
        await checkProfilePoints(profile);
        if (eligible.indexOf(profile) < eligible.length - 1) await sleep(1000);
    }
    log("=== HOÀN THÀNH KIỂM TRA ĐIỂM ===\n");
}
