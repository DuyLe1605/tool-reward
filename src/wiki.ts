/**
 * @fileoverview Lấy nội dung văn bản ngẫu nhiên từ Wikipedia tiếng Việt.
 *
 * Dùng để tạo các câu tìm kiếm tự nhiên, đa dạng về chủ đề.
 * NẾU API THAY ĐỔI: xem https://www.mediawiki.org/wiki/API:Main_page
 */

import { CONFIG } from "./config";

/**
 * Danh sách từ khóa fallback — dùng khi Wikipedia API không khả dụng.
 * Đủ đa dạng để Bing không nhận ra pattern lặp lại.
 */
const FALLBACK_QUERIES = [
    "lịch sử Việt Nam thời kỳ đổi mới kinh tế",
    "công nghệ trí tuệ nhân tạo ứng dụng trong y tế",
    "du lịch Hội An phố cổ di sản văn hóa",
    "ẩm thực miền Trung đặc sản truyền thống",
    "bóng đá Việt Nam vô địch AFF Cup",
    "khởi nghiệp công nghệ startup hệ sinh thái",
    "biến đổi khí hậu tác động môi trường",
    "giáo dục đại học cải cách chương trình",
    "kinh tế số chuyển đổi số doanh nghiệp",
    "văn học Việt Nam hiện đại tác phẩm nổi tiếng",
    "Hà Nội phát triển đô thị giao thông công cộng",
    "nông nghiệp công nghệ cao xuất khẩu gạo",
    "thị trường chứng khoán đầu tư tài chính cá nhân",
    "thiên văn học khám phá vũ trụ NASA",
    "y học cổ truyền thảo dược bài thuốc dân gian",
    "điện thoại thông minh so sánh cấu hình giá",
    "phim Việt Nam điện ảnh đạo diễn trẻ",
    "âm nhạc Vpop xu hướng nghệ sĩ mới",
    "thể thao điền kinh SEA Games huy chương vàng",
    "lập trình web fullstack React Node.js",
    "blockchain tiền điện tử Bitcoin thị trường",
    "du học nước ngoài học bổng Fulbright",
    "sức khỏe tâm thần căng thẳng công việc",
    "nấu ăn tại nhà công thức món ngon dễ làm",
    "xe điện ô tô tương lai năng lượng sạch",
    "văn hóa Nhật Bản anime manga truyện tranh",
    "trekking leo núi Fansipan phượt thủ",
    "nhiếp ảnh kỹ thuật chụp ảnh phong cảnh",
    "thiết kế đồ họa logo thương hiệu",
    "podcast nghe sách học tiếng Anh hàng ngày",
];

// Shared cache of fetched articles to avoid hammering Wikipedia API when running tasks in parallel
let wikiCache: string[] = [];
let isFetching = false;

const WIKI_HEADERS = {
    "User-Agent": "BrewMonsterRewardTool/9.0 (contact@example.com; Web-Search-Bot)"
};

/**
 * Lấy nội dung một bài Wikipedia tiếng Việt ngẫu nhiên dạng plain text.
 * Sử dụng hàng đợi cache dùng chung và thêm header User-Agent để tránh rate limit khi chạy song song.
 */
export async function fetchRobustWikiText(): Promise<string> {
    // Nếu trong cache còn bài viết, lấy ra dùng ngay
    if (wikiCache.length > 0) {
        return wikiCache.shift() || "";
    }

    // Nếu đang có tiến trình khác fetch, chờ tối đa 10 giây
    if (isFetching) {
        for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (wikiCache.length > 0) {
                return wikiCache.shift() || "";
            }
            if (!isFetching) {
                break;
            }
        }
    }

    // Tự fetch và nạp vào cache
    isFetching = true;
    try {
        // Fetch tối đa 3 bài viết tốt để nạp vào cache cho các luồng song song khác
        const fetchedArticles: string[] = [];
        for (let f = 0; f < 3; f++) {
            const article = await doSingleWikiFetch();
            if (article) {
                fetchedArticles.push(article);
            }
        }

        if (fetchedArticles.length > 0) {
            wikiCache.push(...fetchedArticles);
            return wikiCache.shift() || "";
        }
    } finally {
        isFetching = false;
    }

    return "";
}

/**
 * Thực hiện một lượt fetch bài viết ngẫu nhiên từ Wikipedia
 */
async function doSingleWikiFetch(): Promise<string> {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const randomRes = await fetch(CONFIG.wikiApiUrl, {
                headers: WIKI_HEADERS,
                signal: AbortSignal.timeout(8000)
            });
            const randomData = (await randomRes.json()) as {
                query: { random: Array<{ title: string }> };
            };
            const title = randomData.query.random[0].title;

            const contentRes = await fetch(
                `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exintro=0&titles=${encodeURIComponent(title)}&format=json&origin=*`,
                {
                    headers: WIKI_HEADERS,
                    signal: AbortSignal.timeout(8000)
                },
            );
            const contentData = (await contentRes.json()) as {
                query: { pages: Record<string, { extract?: string }> };
            };
            const pages = contentData.query.pages;
            const extract = pages[Object.keys(pages)[0]].extract ?? "";
            // Bài stub thường có extract rất ngắn
            if (extract.length >= 200) return extract;
        } catch {
            // Thử lại
        }
    }
    return "";
}

/**
 * Trả về một chuỗi fallback ngẫu nhiên từ danh sách có sẵn.
 * Dùng khi Wikipedia API liên tục thất bại.
 */
export function getFallbackText(): string {
    // Trộn và ghép 6-8 query ngẫu nhiên thành một đoạn văn dài để search loop có đủ từ
    const shuffled = [...FALLBACK_QUERIES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8).join(" ");
}

