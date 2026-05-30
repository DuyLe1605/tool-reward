# Bing Rewards Auto Search Tool

Tool tự động tìm kiếm trên Bing để tích điểm Microsoft Rewards.
Sử dụng [Playwright](https://playwright.dev/) để điều khiển trình duyệt Edge thật với profile thật của bạn,
kết hợp từ khóa ngẫu nhiên từ Wikipedia tiếng Việt để tránh bị phát hiện tự động.

---

## Tính năng

- Tích điểm tự động cho nhiều profile Edge cùng lúc (song song hoặc tuần tự)
- Từ khóa tìm kiếm ngẫu nhiên từ Wikipedia — tự nhiên, đa dạng chủ đề
- Mô phỏng hành vi người dùng: gõ từng ký tự, cuộn trang, delay ngẫu nhiên
- Tự động hoàn thành nhiệm vụ Daily Set và Keep Earning trên trang Rewards
- Tự động dismiss popup cookie consent khi mở Bing

---

## Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- Microsoft Edge đã đăng nhập tài khoản Microsoft Rewards

## Cài đặt

```bash
npm install
npx playwright install msedge
```

## Cách chạy

```bash
npm start
```

---

## Cấu trúc dự án

```
index.js          ← Entry point (chỉ 1 dòng require)
src/
  config.js       ← Cấu hình trung tâm: URL, delay, đường dẫn Edge
  utils.js        ← Hàm tiện ích: sleep, copyDirRecursive
  profiles.js     ← Đọc profile Edge từ Local State, parse lựa chọn CLI
  wiki.js         ← Lấy văn bản Wikipedia để tạo câu tìm kiếm
  browser.js      ← Tương tác trình duyệt: cookie consent, quiz/poll
  rewards.js      ← Xử lý nhiệm vụ trang rewards.bing.com
  search.js       ← Khởi động Edge, vòng lặp search, gọi rewards
  cli.js          ← Giao diện dòng lệnh, điều phối toàn bộ tác vụ
```

---

## Tài liệu module

### `src/config.js`

Nơi duy nhất chứa các giá trị cấu hình. Cập nhật tại đây khi:

- Microsoft đổi URL trang Rewards → sửa `rewardsUrl`
- Cần giảm/tăng tốc độ search → sửa `minDelay` / `maxDelay`
- Edge cài đặt ở đường dẫn khác → sửa `userDataDir`

---

### `src/profiles.js`

**`getEdgeProfiles()`**
Đọc file `Local State` của Edge để lấy danh sách tất cả profile đang có.

- Nguồn: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Local State`
- Trả về: `[{ folder, name, email }]`
- Cần cập nhật nếu Edge đổi cấu trúc JSON trong file Local State.

**`parseChoices(input, max)`**
Chuyển chuỗi nhập từ CLI (`"1,3"`, `"1-3"`, `"all"`) thành mảng chỉ số 0-based.

---

### `src/wiki.js`

**`fetchRobustWikiText()`**
Lấy nội dung một bài Wikipedia tiếng Việt ngẫu nhiên dạng plain text.
Dùng làm nguồn từ khóa cho vòng lặp search.

- Cập nhật nếu API MediaWiki thay đổi cấu trúc response.

---

### `src/browser.js`

**`dismissCookieConsent(page)`**
Tự động click nút `Accept` trên popup cookie của Bing.

- **Selector cần theo dõi:** `button:has-text("Accept")`
- Cập nhật nếu Microsoft đổi text nút hoặc dùng shadow DOM.

**`handleActivityContent(page)`**
Tương tác với nội dung quiz/poll trong tab popup nhiệm vụ.
Click ngẫu nhiên vào một trong các lựa chọn.

- **Selector cần theo dõi:** `.btOption`, `.rq_button`, `.bt_optionText`, `#rqAnswerOption0`, `.bt_optionTile`
- Chỉ hỗ trợ quiz/poll đơn giản một bước. Quiz nhiều bước cần logic riêng.

---

### `src/rewards.js`

**`completeRewardsActivities(page)`**
Điều hướng đến `rewards.bing.com/earn` và hoàn thành các nhiệm vụ có thể tự động hóa.

Thứ tự xử lý:

1. Mở flyout **Daily Set Streak** → xử lý từng card → đóng flyout
2. Xử lý khu vực **Keep Earning** (`section#moreactivities`)
3. Click **Show more** nếu có

**Selectors cần theo dõi khi Microsoft đổi giao diện:**

| Thành phần           | Selector hiện tại                                                       |
| -------------------- | ----------------------------------------------------------------------- |
| Banner Daily Set     | `text="Daily Set Streak"`                                               |
| Button mở flyout     | `button.rounded-cornerCardDefault` filter `hasText /Daily Set Streak/i` |
| Flyout dialog        | `section[role="dialog"]`, `.bg-flyout`                                  |
| Nút đóng flyout      | `button[aria-label="Close"]`                                            |
| Card nhiệm vụ        | `.rounded-cornerCardDefault`, `a[href*="quiz"]`                         |
| Card đã xong         | class `bg-statusSuccessRewardsBg`, icon `mee-icon-CheckMark`            |
| Khu vực Keep Earning | `section#moreactivities`                                                |
| Nút show more        | `button:has-text("Show more")`                                          |

**Danh sách bỏ qua (`skipKeywords`):** quest, punch card, check-in, bing app, redeem, search bar
→ Cập nhật nếu Microsoft thêm loại nhiệm vụ mới không hỗ trợ tự động hóa.

---

### `src/search.js`

**`performProfileTask(selectedProfile, maxSearches, isParallel)`**
Toàn bộ luồng xử lý cho một profile: khởi động Edge → search → rewards → đóng.

**Chế độ song song (`isParallel = true`):**
Playwright yêu cầu mỗi instance Edge có `userDataDir` riêng biệt.
Profile được copy sang thư mục tạm (`os.tmpdir()/reward-XXXX`) trước khi launch.
Thư mục tạm bị xóa trong `finally` sau khi hoàn thành.

**Anti-detection (ẩn dấu hiệu automation):**

- `navigator.webdriver` → override thành `undefined`
- `window.chrome` → tạo object giả
- `navigator.languages` → set `['vi-VN', 'vi', 'en-US', 'en']`
- Flag `--enable-automation` → loại bỏ
- Flag `AutomationControlled` → disable

**Selector cần theo dõi:**

- Thanh tìm kiếm Bing: `textarea[name="q"], input[name="q"]`
  (Bing đã đổi từ `input` sang `textarea` — cập nhật nếu đổi lại)

---

### `src/cli.js`

**`runAutoSearch()`**
Hàm điều phối chính: kill Edge → hiện danh sách profile → hỏi người dùng → chạy tác vụ.

---

## Khi Microsoft thay đổi giao diện

1. **Nút/text đổi tên** → Tìm selector trong `src/browser.js` hoặc `src/rewards.js`
2. **URL đổi** → Sửa `rewardsUrl` trong `src/config.js`
3. **Loại nhiệm vụ mới** → Thêm logic trong `src/rewards.js` → `processContainer()`
4. **Quiz nhiều bước** → Thêm hàm mới trong `src/browser.js`
5. **Cấu trúc profile Edge đổi** → Sửa `getEdgeProfiles()` trong `src/profiles.js`

---

## Lên lịch tự động (Windows Task Scheduler)

1. Mở **Task Scheduler** → Create Basic Task
2. Đặt lịch: Daily
3. Action: Start a Program
    - Program: `node`
    - Arguments: `index.js`
    - Start in: `<đường dẫn thư mục tool>`
