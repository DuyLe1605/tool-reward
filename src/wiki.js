/**
 * @fileoverview Lấy nội dung văn bản ngẫu nhiên từ Wikipedia tiếng Việt.
 *
 * Mục đích: Tạo ra các câu tìm kiếm tự nhiên, đa dạng về chủ đề để tránh
 * bị Bing phát hiện là bot (pattern lặp lại hoặc từ khóa nhân tạo).
 *
 * Luồng xử lý:
 *   1. Gọi API Wikipedia để lấy tiêu đề bài viết ngẫu nhiên
 *   2. Gọi tiếp API để lấy nội dung bài viết đó dạng plain text
 *   3. Trả về toàn bộ văn bản để module search.js cắt thành từng câu query
 *
 * NẾU API WIKIPEDIA THAY ĐỔI:
 *   Kiểm tra tài liệu tại https://www.mediawiki.org/wiki/API:Main_page
 *   Có thể thay thế bằng nguồn văn bản khác (vd: news API) nếu cần.
 */

const { CONFIG } = require("./config");

/**
 * Lấy nội dung một bài Wikipedia tiếng Việt ngẫu nhiên dạng plain text.
 *
 * API sử dụng:
 *   - Bước 1 (lấy tiêu đề): action=query&list=random
 *   - Bước 2 (lấy nội dung): action=query&prop=extracts&explaintext
 *
 * @returns {Promise<string>}
 *   Nội dung bài viết dạng plain text.
 *   Trả về chuỗi rỗng nếu mạng lỗi hoặc API không phản hồi đúng.
 */
async function fetchRobustWikiText() {
    try {
        const randomRes = await fetch(CONFIG.wikiApiUrl);
        const randomData = await randomRes.json();
        const title = randomData.query.random[0].title;

        const contentRes = await fetch(
            `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&exintro=0&titles=${encodeURIComponent(title)}&format=json&origin=*`,
        );
        const contentData = await contentRes.json();
        const pages = contentData.query.pages;
        return pages[Object.keys(pages)[0]].extract || "";
    } catch (e) {
        return "";
    }
}

module.exports = { fetchRobustWikiText };
