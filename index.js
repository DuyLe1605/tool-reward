const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const CONFIG = {
    userDataDir: path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data'),
    wikiApiUrl: 'https://vi.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*',
    rewardsUrl: 'https://rewards.bing.com/',
    minQueryWords: 6,
    maxQueryWords: 10,
    minDelay: 25000, 
    maxDelay: 50000, 
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
        await page.goto(CONFIG.rewardsUrl, { waitUntil: 'networkidle' });
        await sleep(5000);

        // 1. Xử lý Daily Set
        console.log('Đang kiểm tra Daily Set...');
        const dailyItems = await page.locator('.daily-set-item, .mee-rewards-daily-set-item-view').all();
        for (const item of dailyItems) {
            const isCompleted = await item.locator('.mee-icon-CheckMark, .completed').count() > 0;
            if (!isCompleted) {
                console.log('Đang thực hiện một nhiệm vụ Daily Set...');
                const [popup] = await Promise.all([
                    page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
                    item.click().catch(() => {}),
                ]);

                if (popup) {
                    await popup.waitForLoadState('networkidle');
                    await sleep(5000);
                    await handleActivityContent(popup);
                    await popup.close();
                } else {
                    // Nếu không mở popup, có thể nó mở một panel bên phải (như user mô tả)
                    console.log('Kiểm tra xem có panel phụ nào xuất hiện không...');
                    await sleep(2000);
                    const subActivities = await page.locator('.ds-card-sec, .p-card, .overlay-item').all();
                    for (const sub of subActivities) {
                        const isSubCompleted = await sub.locator('.mee-icon-CheckMark, .completed').count() > 0;
                        if (!isSubCompleted) {
                            console.log('Đang thực hiện nhiệm vụ trong panel...');
                            const [subPopup] = await Promise.all([
                                page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
                                sub.click().catch(() => {}),
                            ]);
                            if (subPopup) {
                                await subPopup.waitForLoadState('networkidle');
                                await sleep(3000);
                                await subPopup.close();
                            }
                            await sleep(2000);
                        }
                    }
                }
                await sleep(3000);
            }
        }

        // 2. Xử lý Keep Earning (More Activities)
        console.log('Đang kiểm tra các nhiệm vụ "Keep earning"...');
        // Cuộn xuống để load hết
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(2000);

        const moreItems = await page.locator('.promotional-item, [data-bi-name="more_activities_item"]').all();
        for (const item of moreItems) {
            const isCompleted = await item.locator('.mee-icon-CheckMark, .completed').count() > 0;
            const pointsText = await item.innerText();
            const hasPoints = pointsText.includes('+') || pointsText.includes('pts');

            if (!isCompleted && hasPoints) {
                console.log('Đang thực hiện nhiệm vụ bổ sung...');
                const [popup] = await Promise.all([
                    page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
                    item.click().catch(() => {}),
                ]);

                if (popup) {
                    await popup.waitForLoadState('networkidle');
                    await sleep(5000);
                    await handleActivityContent(popup);
                    await popup.close();
                }
                await sleep(3000);
            }
        }
    } catch (err) {
        console.error(`Lỗi khi xử lý Rewards: ${err.message}`);
    }
}

async function handleActivityContent(page) {
    try {
        // Xử lý khảo sát (Poll)
        const pollOption = page.locator('.btOption, #btoption0, .bt_optionTile').first();
        if (await pollOption.isVisible()) {
            console.log('Đang chọn khảo sát...');
            await pollOption.click();
            await sleep(3000);
            return;
        }

        // Xử lý Quiz (chọn đáp án đầu tiên cho đến khi xong)
        const quizOption = page.locator('.rq_button, .bt_optionText, #rqAnswerOption0').first();
        if (await quizOption.isVisible()) {
            console.log('Đang làm Quiz...');
            for (let i = 0; i < 10; i++) { // Thử tối đa 10 câu
                const options = await page.locator('.rq_button, .bt_optionText, #rqAnswerOption0').all();
                if (options.length > 0) {
                    await options[Math.floor(Math.random() * options.length)].click();
                    await sleep(2000);
                } else {
                    break;
                }
            }
        }
    } catch (e) {}
}

async function runAutoSearch() {
    try {
        console.log('Đang dọn dẹp tiến trình Edge...');
        execSync('taskkill /F /IM msedge.exe /T', { stdio: 'ignore' });
    } catch (e) {}

    console.log('=========================================');
    console.log('   BING REWARDS AUTO SEARCH TOOL v8');
    console.log('   (DEEP STEALTH MODE - NO WEBDRIVER)');
    console.log('=========================================\n');

    const profiles = getEdgeProfiles();
    profiles.forEach((p, index) => console.log(`${index + 1}. [${p.name}] - ${p.email}`));
    const choice = await askQuestion('\nChọn Profile [1]: ') || '1';
    const selectedProfile = profiles[parseInt(choice) - 1] || profiles[0];
    const maxSearches = parseInt(await askQuestion('Số lượt search [35]: ') || '35');

    const context = await chromium.launchPersistentContext(CONFIG.userDataDir, {
        channel: 'msedge',
        headless: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        viewport: { width: 1366, height: 768 },
        ignoreDefaultArgs: ['--enable-automation'], // Quan trọng: Xóa bỏ cờ tự động mặc định
        args: [
            `--profile-directory=${selectedProfile.folder}`,
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
        ]
    });

    const page = await context.newPage();

    // XÓA BỎ DẤU VẾT WEBDRIVER (CỰC KỲ QUAN TRỌNG)
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    await page.goto('https://www.bing.com');
    console.log('Đang chờ ổn định tài khoản (10s)...');
    await sleep(10000);

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
            console.log(`\n[${totalSearched}/${maxSearches}] Đang tìm: "${query}"`);

            try {
                await page.goto('https://www.bing.com', { waitUntil: 'networkidle' });
                const searchBox = await page.waitForSelector('textarea[name="q"], input[name="q"]');
                
                // Di chuyển chuột ảo đến ô search
                await searchBox.hover();
                await sleep(500);
                await searchBox.click();
                
                await page.keyboard.type(query, { delay: Math.random() * 200 + 100 });
                await page.keyboard.press('Enter');
                await page.waitForLoadState('networkidle');
                await sleep(5000);

                // Cuộn trang
                await page.evaluate(() => {
                    const scrollStep = 100;
                    const scrollCount = Math.floor(Math.random() * 5) + 3;
                    let currentScroll = 0;
                    const timer = setInterval(() => {
                        window.scrollBy(0, scrollStep);
                        currentScroll++;
                        if (currentScroll >= scrollCount) clearInterval(timer);
                    }, 200);
                });

                const waitTime = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
                console.log(`Nghỉ ${waitTime / 1000} giây...`);
                await sleep(waitTime);
            } catch (err) {
                console.error(`Lỗi: ${err.message}`);
            }
            i += chunkSize;
        }
    }

    // Sau khi search xong, chuyển qua làm nhiệm vụ Rewards
    await completeRewardsActivities(page);

    console.log('\n--- HOÀN THÀNH ---');
    await context.close();
    rl.close();
}

runAutoSearch().catch(err => console.error(err));
