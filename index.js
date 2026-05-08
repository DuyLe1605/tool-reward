const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const CONFIG = {
    userDataDir: path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data'),
    wikiApiUrl: 'https://vi.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*',
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

async function runAutoSearch() {
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

    console.log('\n--- HOÀN THÀNH ---');
    await context.close();
    rl.close();
}

runAutoSearch().catch(err => console.error(err));
