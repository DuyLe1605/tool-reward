/**
 * @fileoverview Lấy nội dung văn bản ngẫu nhiên từ Wikipedia tiếng Việt.
 *
 * Dùng để tạo các câu tìm kiếm tự nhiên, đa dạng về chủ đề.
 * NẾU API THAY ĐỔI: xem https://www.mediawiki.org/wiki/API:Main_page
 */

import { CONFIG } from "./config";

/**
 * Lấy nội dung một bài Wikipedia tiếng Việt ngẫu nhiên dạng plain text.
 * Trả về chuỗi rỗng nếu mạng lỗi hoặc API không phản hồi đúng.
 */
export async function fetchRobustWikiText(): Promise<string> {
    try {
        const randomRes = await fetch(CONFIG.wikiApiUrl);
        const randomData = (await randomRes.json()) as {
            query: { random: Array<{ title: string }> };
        };
        const title = randomData.query.random[0].title;

        const contentRes = await fetch(
            `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exintro=0&titles=${encodeURIComponent(title)}&format=json&origin=*`,
        );
        const contentData = (await contentRes.json()) as {
            query: { pages: Record<string, { extract?: string }> };
        };
        const pages = contentData.query.pages;
        return pages[Object.keys(pages)[0]].extract ?? "";
    } catch {
        return "";
    }
}
