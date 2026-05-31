# Bing Rewards Auto Search Tool

Công cụ tự động tích điểm Microsoft Rewards qua Bing Search.  
Sử dụng [Playwright](https://playwright.dev/) điều khiển trình duyệt Edge thật với profile thật, kết hợp Web UI để theo dõi và điều khiển.

---

## Tính năng

- **Search tự động** cho nhiều profile Edge — desktop, mobile, hoặc cả hai
- **Web UI realtime** theo dõi tiến độ, điểm thưởng qua WebSocket
- **Điểm thưởng**: hiển thị điểm hôm nay, khả dụng, tiến độ desktop/mobile từng profile
- **Hoàn thành nhiệm vụ** Daily Set Streak và Keep Earning tự động
- Từ khóa từ Wikipedia tiếng Việt + danh sách dự phòng khi Wikipedia không khả dụng
- Auto-dismiss cookie consent trên cả desktop và mobile browser
- Dừng giữa chừng an toàn qua nút Stop trên UI
- **[v9.0.5]** Log console tô màu tên profile — mỗi profile một màu riêng, dễ theo dõi song song
- **[v9.0.5]** Progress bar split — thanh xanh (desktop) + tím (mobile), hiển thị đúng từ đầu với mọi chế độ
- **[v9.0.5]** System tray — thu nhỏ xuống tray thay vì đóng app, click để mở lại
- **[v9.0.5]** Desktop notification khi task hoàn thành — hiển thị số profile và tổng điểm kiếm được

---

## Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- Microsoft Edge đã đăng nhập tài khoản Microsoft Rewards trên các profile

---

## Cài đặt & Chạy

```bash
# Cài dependencies backend
npm install

# Cài dependencies frontend
cd web && npm install && npm run build && cd ..

# Khởi động server (backend + serve frontend)
npm run web
```

Sau đó mở trình duyệt tại `http://localhost:3000`

---

## Cấu trúc dự án

```
server/
  index.ts        ← Entry point Express server, serve web/dist/
  routes.ts       ← REST API: /api/status, /api/profiles, /api/start, /api/stop, ...
  stateStore.ts   ← Lưu trạng thái app vào data/app-state.json
  taskManager.ts  ← Quản lý task đang chạy, progress từng profile
  ws.ts           ← WebSocket server — push log/progress/points realtime

src/
  config.ts       ← Cấu hình trung tâm: URL, delay, đường dẫn Edge
  utils.ts        ← sleep, copyDirRecursive, AbortSignal
  profiles.ts     ← Đọc profile Edge từ Local State
  wiki.ts         ← fetchRobustWikiText() + getFallbackText()
  browser.ts      ← dismissCookieConsent, setupCookieConsentHandler, handleActivityContent
  rewards.ts      ← completeRewardsActivities() — Daily Set + Keep Earning
  pointsScraper.ts← scrapeAvailablePoints, scrapeRewardsPoints, fetchAndEmitPoints
  checkPoints.ts  ← Kiểm tra điểm không search (nút "Kiểm tra điểm")
  search.ts       ← Luồng search chính: mobile-only / desktop / both
  logger.ts       ← log(), emitProgress(), emitPoints(), emitLog() qua EventEmitter
  taskController.ts← shouldStop flag, context registry
  wakeLock.ts     ← Giữ màn hình không tắt (Windows)
  cli.ts          ← CLI legacy (không dùng khi chạy web)

web/src/
  App.tsx                   ← Layout chính
  store/useAppStore.ts      ← Zustand store: progress, points, logs
  hooks/useWebSocket.ts     ← Nhận realtime từ server WebSocket
  components/
    ControlPanel.tsx        ← Chọn profile, chế độ search, nút Start/Stop
    ProgressPanel.tsx       ← Tiến độ search + bảng điểm thưởng
    LogConsole.tsx          ← Console log realtime
    PointsDetailDialog.tsx  ← Chi tiết điểm từng profile
    Header.tsx              ← Trạng thái kết nối, dark mode
  api/index.ts              ← REST API client

data/
  app-state.json  ← Lưu trạng thái điểm thưởng giữa các lần chạy
```

---

## Kiến trúc luồng dữ liệu

```
Browser UI ←──WebSocket──→ server/ws.ts ←── logEmitter (src/logger.ts)
     │                                              ↑
     └──REST API──→ server/routes.ts         src/search.ts
                         │                   src/rewards.ts
                         └── taskManager.ts  src/checkPoints.ts
                                  │
                              Playwright → Edge/Chromium
```

---

## Luồng search

### Mobile-only

1. Mở Edge headless → lấy cookies → đóng
2. `performMobileSearch(cookies)` — Chromium với Android UA
3. Mở Edge headless:false → `fetchAndEmitPoints` → đóng

### Desktop-only

1. Mở Edge → search loop (90 lượt)
2. `completeRewardsActivities` — nhiệm vụ Rewards + `fetchAndEmitPoints`
3. Đóng Edge

### Both

1. Desktop search (90 lượt)
2. `completeRewardsActivities` + emit điểm lần 1
3. Đóng Edge → `performMobileSearch` (60 lượt)
4. Mở Edge mới → `fetchAndEmitPoints` → emit điểm lần 2 (cập nhật mobile count + available)

---

## Cập nhật điểm — pipeline

`fetchAndEmitPoints(page, profileName)` trong `src/pointsScraper.ts`:

```
goto(rewards.bing.com/)
  → waitForDashboard
  → scrapeAvailablePoints()   ← "Available points" card trên dashboard
  → goto(/earn)
  → scrapeRewardsPoints()     ← mở flyout "Points breakdown"
  → merge available vào kết quả
  → emitPoints() → WebSocket → UI
```

Gọi từ: `checkPoints.ts`, `rewards.ts` (cuối desktop), `search.ts` (sau mobile).

---

## Selector cần theo dõi khi Microsoft đổi giao diện

| Thành phần             | File               | Selector hiện tại                                                                      |
| ---------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| Cookie consent desktop | `browser.ts`       | `#bnp_btn_accept a`, `#bnp_btn_accept`                                                 |
| Cookie consent mobile  | `search.ts`        | `button:has-text("Accept")`, `button:has-text("Accept all")`                           |
| Thanh tìm kiếm Bing    | `search.ts`        | `textarea[name="q"], input[name="q"]`                                                  |
| Nút Daily Set Streak   | `rewards.ts`       | `text="Daily Set Streak"`, `button.rounded-cornerCardDefault`                          |
| Flyout dialog          | `rewards.ts`       | `section[role="dialog"]`, `.bg-flyout`                                                 |
| Card đã xong           | `rewards.ts`       | class `bg-statusSuccessRewardsBg`, icon `mee-icon-CheckMark`                           |
| Nút Points breakdown   | `pointsScraper.ts` | `button:has-text("Points breakdown")`                                                  |
| Available points card  | `pointsScraper.ts` | `p[text="Available points"]` → `parentElement.parentElement` → `[class*="pageHeader"]` |

---

## Cấu hình (`src/config.ts`)

| Key                     | Mô tả                                 |
| ----------------------- | ------------------------------------- |
| `userDataDir`           | Đường dẫn User Data của Edge          |
| `rewardsUrl`            | `https://rewards.bing.com/earn`       |
| `minDelay` / `maxDelay` | Delay ngẫu nhiên giữa các search (ms) |
| `port`                  | Port HTTP server (mặc định 3000)      |

---

## Khi có vấn đề

- **Available points = 0**: Microsoft có thể đã đổi class `text-pageHeader` trên dashboard → kiểm tra selector trong `pointsScraper.ts → scrapeAvailablePoints()`
- **Cookie consent không tự đóng (mobile)**: Kiểm tra text nút trong `search.ts → mobileConsentSelectors`
- **Search bị treo**: Wikipedia trả về bài quá ngắn → `wiki.ts` tự retry 3 lần rồi dùng fallback keywords
- **Profile không tìm thấy**: Edge đổi cấu trúc `Local State` → sửa `profiles.ts → getEdgeProfiles()`
