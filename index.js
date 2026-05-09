const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const CONFIG = {
    userDataDir: path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data'),
    wikiApiUrl: 'https://vi.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*',
    rewardsUrl: 'https://rewards.bing.com/earn',
    minQueryWords: 6,
    maxQueryWords: 10,
    minDelay: 10000, 
    maxDelay: 20000, 
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function askQuestion(query) { return new Promise(resolve => rl.question(query, resolve)); }

function getEdgeProfiles() {
    const localStatePath = path.join(CONFIG.userDataDir, 'Local State');
    const profiles = [];
    if (fs.existsSync(localStatePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
            const infoCache = data.profile.info_cache;
            for (const key in infoCache) {
                profiles.push({ folder: key, name: infoCache[key].name || key, email: infoCache[key].user_name || 'No Email' });
            }
        } catch (e) {}
    }
    return profiles.length ? profiles : [{ folder: 'Default', name: 'Default', email: 'Unknown' }];
}

async function fetchRobustWikiText() {
    try {
        const randomRes = await fetch(CONFIG.wikiApiUrl);
        const randomData = await randomRes.json();
        const title = randomData.query.random[0].title;
        const contentRes = await fetch(`https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exintro=0&titles=${encodeURIComponent(title)}&format=json&origin=*`);
        const contentData = await contentRes.json();
        const pages = contentData.query.pages;
        return pages[Object.keys(pages)[0]].extract || "";
    } catch (e) { return ""; }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function completeRewardsActivities(page) {
    console.log('\n--- ĐANG XỬ LÝ CÁC NHIỆM VỤ REWARDS ---');
    try {
        await page.goto(CONFIG.rewardsUrl, { waitUntil: 'domcontentloaded' });
        await sleep(5000);

        // 1. Mở bảng Daily Set nếu nó chưa mở
        console.log('Đang tìm và mở bảng Daily Set Streak...');
        const dailySetHeader = page.locator('text="Daily Set Streak"').first();
        if (await dailySetHeader.isVisible()) {
            await dailySetHeader.click();
            await sleep(3000);
        }

        // 1. Mở bảng Daily Set Streak (Flyout) nếu chưa mở
        const dailySetBtn = page.locator('button, .rounded-cornerCardDefault').filter({ hasText: /Daily Set Streak/i }).first();
        if (await dailySetBtn.count() > 0) {
            const isExpanded = await dailySetBtn.getAttribute('aria-expanded') === 'true';
            if (!isExpanded) {
                console.log('Đang mở bảng Daily Set Streak...');
                await dailySetBtn.click({ force: true }).catch(() => {});
                await page.waitForSelector('section[role="dialog"], [role="dialog"]', { state: 'visible', timeout: 5000 }).catch(() => {});
                await sleep(2000);
            }
        }

        // 2. Hàm xử lý nhiệm vụ trong một vùng cụ thể (Focus Mode)
        const processContainer = async (containerLocator, label) => {
            if (await containerLocator.count() === 0) return;
            
            await containerLocator.scrollIntoViewIfNeeded().catch(() => {});
            const cards = await containerLocator.locator('.rounded-cornerCardDefault, a[href*="search"], a[href*="quiz"]').all();
            
            console.log(`--- Đang quét: ${label} (${cards.length} mục) ---`);

            for (const card of cards) {
                try {
                    const cardHtml = await card.innerHTML();
                    const cardText = (await card.innerText()).toLowerCase().replace(/\s+/g, ' ');
                    const href = await card.getAttribute('href') || '';
                    const title = cardText.split('\n')[0].substring(0, 40).trim();

                    if ((cardText.includes('daily set streak') || cardText.includes('keep earning')) && label !== 'Bảng Flyout') continue;

                    const isCompleted = cardHtml.includes('bg-statusSuccessRewardsBg') 
                                        || cardHtml.includes('mee-icon-CheckMark')
                                        || cardText.includes('completed') 
                                        || cardText.includes('đã hoàn thành');
                    if (isCompleted) continue;

                    const skipKeywords = ['quest', 'expires', 'punch card', 'tháng 5', 'may highlights', 'check-in', 'bing app', 'redeem'];
                    if (skipKeywords.some(k => cardText.includes(k)) || href.includes('/quest/')) continue;

                    if (!cardText.includes('+') && !cardText.includes('pts') && !/\d+/.test(cardText)) continue;

                    console.log(`- Đang xử lý: "${title}"`);
                    await card.scrollIntoViewIfNeeded().catch(() => {});
                    
                    const [popup] = await Promise.all([
                        page.waitForEvent('popup', { timeout: 8000 }).catch(() => null),
                        card.click({ force: true }).catch(() => {}),
                    ]);

                    if (popup) {
                        await popup.waitForLoadState('load');
                        await sleep(5000);
                        await handleActivityContent(popup);
                        await popup.close();
                    }
                    await sleep(2000);
                } catch (e) {}
            }
        };

        // BƯỚC 1: Xử lý Flyout
        const flyout = page.locator('section[role="dialog"], [role="dialog"], .bg-flyout').first();
        if (await flyout.isVisible()) {
            await processContainer(flyout, 'Bảng Flyout');
            console.log('Đóng bảng Daily Set...');
            const closeBtn = flyout.locator('button[aria-label="Close"], button:has-text("Close")').first();
            if (await closeBtn.isVisible()) await closeBtn.click().catch(() => {});
            else await page.keyboard.press('Escape');
            await sleep(2000);
        }

        // BƯỚC 2: Xử lý Keep earning (section#moreactivities)
        const moreActivities = page.locator('section#moreactivities').first();
        if (await moreActivities.count() > 0) {
            await processContainer(moreActivities, 'Khu vực Keep Earning');
        }

        // Cuộn xuống cuối trang để load phần "Keep earning"
        console.log('\nĐang cuộn xuống để tìm thêm nhiệm vụ...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(3000);

        console.log('\n--- HOÀN THÀNH ---');

    } catch (err) {
        console.error(`Lỗi tổng thể Rewards: ${err.message}`);
    }
}

async function handleActivityContent(page) {
    try {
        // Click đại một cái nếu là Poll hoặc Quiz đơn giản
        const options = await page.locator('.btOption, .rq_button, .bt_optionText, #rqAnswerOption0, .bt_optionTile').all();
        if (options.length > 0) {
            console.log('  Đang tương tác với nội dung (Poll/Quiz)...');
            await options[Math.floor(Math.random() * options.length)].click().catch(() => {});
            await sleep(2000);
        }
    } catch (e) {}
}

function parseChoices(input, max) {
    if (input.toLowerCase() === 'all') {
        return Array.from({ length: max }, (_, i) => i);
    }
    const choices = [];
    const parts = input.split(/[, ]+/);
    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= max) choices.push(i - 1);
            }
        } else {
            const val = parseInt(part);
            if (val >= 1 && val <= max) choices.push(val - 1);
        }
    }
    return [...new Set(choices)].sort((a, b) => a - b);
}

async function performProfileTask(selectedProfile, maxSearches) {
    const prefix = `[${selectedProfile.name}]`;
    console.log(`\n>>> BẮT ĐẦU: ${prefix} (${selectedProfile.email})`);

    try {
        const context = await chromium.launchPersistentContext(CONFIG.userDataDir, {
            channel: 'msedge',
            headless: false,
            userAgent: 'Mozilla/5.0 (Windows NT NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
            viewport: { width: 1280, height: 720 },
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                `--profile-directory=${selectedProfile.folder}`,
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-infobars',
            ]
        });

        const page = await context.newPage();

        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        });

        await page.goto('https://www.bing.com');
        console.log(`${prefix} Đang chờ ổn định tài khoản (5s)...`);
        await sleep(5000);

        let totalSearched = 0;
        while (totalSearched < maxSearches) {
            const rawText = await fetchRobustWikiText();
            const words = rawText.replace(/[\n\r.,!?()"]/g, "").split(/\s+/).filter(w => w.length > 0);
            let i = 0;
            
            while (i < words.length && totalSearched < maxSearches) {
                const chunkSize = Math.floor(Math.random() * 5) + 6;
                const query = words.slice(i, i + chunkSize).join(" ");
                if (!query.trim()) { i += chunkSize; continue; }

                totalSearched++;
                console.log(`${prefix} [${totalSearched}/${maxSearches}] Đang tìm: "${query}"`);

                try {
                    await page.goto('https://www.bing.com', { waitUntil: 'networkidle' });
                    const searchBox = await page.waitForSelector('textarea[name="q"], input[name="q"]', { timeout: 10000 });
                    
                    await searchBox.hover();
                    await sleep(500);
                    await searchBox.click();
                    
                    await page.keyboard.type(query, { delay: Math.random() * 100 + 50 });
                    await page.keyboard.press('Enter');
                    await page.waitForLoadState('networkidle');
                    await sleep(3000);

                    await page.evaluate(() => {
                        window.scrollBy(0, Math.floor(Math.random() * 500) + 200);
                    });

                    const waitTime = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
                    console.log(`${prefix} Nghỉ ${waitTime / 1000} giây...`);
                    await sleep(waitTime);
                } catch (err) {
                    console.error(`${prefix} Lỗi search: ${err.message}`);
                    break;
                }
                i += chunkSize;
            }
        }

        await completeRewardsActivities(page);

        console.log(`\n<<< HOÀN THÀNH: ${prefix}`);
        await context.close();
    } catch (err) {
        console.error(`${prefix} LỖI NGHIÊM TRỌNG: ${err.message}`);
        console.log(`${prefix} Có thể do Profile đang được mở ở một cửa sổ khác.`);
    }
}

async function runAutoSearch() {
    try {
        console.log('Đang dọn dẹp tiến trình Edge...');
        execSync('taskkill /F /IM msedge.exe /T', { stdio: 'ignore' });
    } catch (e) {}

    console.log('=========================================');
    console.log('   BING REWARDS AUTO SEARCH TOOL v8.1');
    console.log('   (MULTI-PROFILE SUPPORT)');
    console.log('=========================================\n');

    const profiles = getEdgeProfiles();
    profiles.forEach((p, index) => console.log(`${index + 1}. [${p.name}] - ${p.email}`));
    
    console.log('\nHD: Nhập số (1,2), khoảng (1-3), hoặc "all"');
    const choiceInput = await askQuestion('Chọn các Profile [1]: ') || '1';
    const selectedIndices = parseChoices(choiceInput, profiles.length);
    
    if (selectedIndices.length === 0) {
        console.log('Không có profile nào được chọn. Thoát.');
        rl.close();
        return;
    }

    const maxSearches = parseInt(await askQuestion('Số lượt search mỗi profile [35]: ') || '35');
    const mode = selectedIndices.length > 1 ? (await askQuestion('Chạy song song (p) hay lần lượt (s)? [s]: ') || 's') : 's';

    console.log(`\nBắt đầu xử lý ${selectedIndices.length} profile...\n`);

    if (mode.toLowerCase() === 'p') {
        // Chạy song song
        const tasks = selectedIndices.map(idx => performProfileTask(profiles[idx], maxSearches));
        await Promise.all(tasks);
    } else {
        // Chạy lần lượt
        for (const idx of selectedIndices) {
            await performProfileTask(profiles[idx], maxSearches);
        }
    }

    console.log('\n=========================================');
    console.log('   TẤT CẢ TÁC VỤ ĐÃ HOÀN THÀNH!');
    console.log('=========================================');
    rl.close();
}

runAutoSearch().catch(err => {
    console.error(err);
    rl.close();
});

