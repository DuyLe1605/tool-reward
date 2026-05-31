# Hướng dẫn Release — Rewards Tool (Electron)

## Tổng quan

App được đóng gói thành file `.exe` installer (NSIS) bằng `electron-builder`.  
Khi bạn **push một git tag** có dạng `v*`, GitHub Actions sẽ tự động:

1. Build React frontend
2. Compile TypeScript (server + electron)
3. Đóng gói thành `RewardsTool-Setup-x.y.z.exe`
4. Publish lên GitHub Releases
5. Upload `latest.yml` → user đang dùng app sẽ nhận được thông báo cập nhật tự động

---

## Cấu trúc build output

```
release/                          ← electron-builder output
  RewardsTool-Setup-9.0.0.exe     ← installer người dùng tải về
  latest.yml                      ← metadata auto-updater đọc để so sánh version

dist-electron/                    ← electron/main.ts, electron/preload.ts đã compile
  main.js
  preload.js

dist/                             ← server/ + src/ đã compile (tsc)
  server/
    index.js
    routes.js
    stateStore.js
    ...
  src/
    search.js
    browser.js
    ...

web/dist/                         ← React build (Vite)
  index.html
  assets/
```

---

## GitHub config cần thiết

### Bắt buộc: 1 việc duy nhất

Vào repo GitHub → **Settings → Actions → General → Workflow permissions**  
Chọn **"Read and write permissions"** → Save.

> Đây là quyền cho `GITHUB_TOKEN` được tự động tạo khi workflow chạy.  
> Không cần tạo PAT (Personal Access Token) hay secret nào thêm.  
> `GH_TOKEN` trong workflow tự dùng `secrets.GITHUB_TOKEN` do GitHub inject.

### Không cần làm gì thêm

| Thứ                         | Cần setup?     | Lý do                                              |
| --------------------------- | -------------- | -------------------------------------------------- |
| `GH_TOKEN` / `GITHUB_TOKEN` | Không          | GitHub tự tạo cho mỗi workflow run                 |
| Code signing certificate    | Không bắt buộc | App vẫn chạy được, chỉ Windows SmartScreen warning |
| Secrets khác                | Không          |                                                    |

---

## Quy trình release từng bước

### Lần đầu (setup 1 lần)

```bash
# 1. Cài packages mới
npm install

# 2. Tạo icon app (bắt buộc để build không lỗi)
#    Đặt file icon vào: assets/icon.ico (256x256 px)
#    Có thể dùng công cụ online: https://convertio.co/png-ico/

# 3. Test build local trước
npm run release:build
# → Tạo ra release/RewardsTool-Setup-x.y.z.exe nhưng KHÔNG upload lên GitHub
```

### Mỗi lần release

```bash
# 1. Sửa version trong package.json
#    "version": "9.1.0"   ← tăng theo SemVer: MAJOR.MINOR.PATCH

# 2. Commit tất cả thay đổi
git add .
git commit -m "chore: release v9.1.0"

# 3. Push code + tạo tag
git push origin feature/web-ui     # hoặc branch của bạn
git tag v9.1.0
git push origin v9.1.0
```

GitHub Actions bắt đầu chạy ngay sau khi push tag.  
Xem tiến độ tại: **GitHub → repo → Actions tab**.

Khi xong (~5-10 phút), vào **Releases tab** sẽ thấy bản mới.

---

## Versioning (SemVer)

```
MAJOR.MINOR.PATCH
  │      │     └─ Bug fix, hotfix
  │      └─────── Tính năng mới, không breaking
  └────────────── Breaking change lớn (refactor kiến trúc, ...)
```

Ví dụ: `9.0.0` → `9.0.1` (fix bug) → `9.1.0` (thêm feature) → `10.0.0` (rewrite)

---

## Cách user cài lần đầu

1. Vào GitHub → **Releases** → tải `RewardsTool-Setup-x.y.z.exe`
2. Chạy file `.exe` → NSIS installer hiện lên
3. Chọn thư mục cài đặt → Install → shortcut được tạo ở Desktop + Start Menu
4. Mở app lên → app tự khởi động Express server nội bộ + mở giao diện web

---

## Cách user nhận update tự động

User **không cần làm gì**. Khi mở app:

1. `electron-updater` check `https://github.com/DuyLe1605/tool-reward/releases/latest/download/latest.yml`
2. So sánh version trong file với version app đang chạy
3. Nếu có bản mới → tải ngầm installer mới
4. Hiện dialog: "Bản v9.1.0 đã tải xong. Khởi động lại để áp dụng?"
5. User click "Khởi động lại ngay" → installer chạy silent → app restart với bản mới

---

## Data người dùng (không bị xóa khi update)

Dữ liệu app (`app-state.json`) được lưu tại:

```
Windows: %APPDATA%\Rewards Tool\app-state.json
         (thường là C:\Users\<tên>\AppData\Roaming\Rewards Tool\)
```

Update app **không đụng đến thư mục này** — dữ liệu được giữ nguyên.

---

## Troubleshooting

### Build lỗi "icon.ico not found"

→ Tạo file `assets/icon.ico` (xem hướng dẫn ở trên)

### Windows SmartScreen cảnh báo khi user chạy .exe

→ Bình thường nếu app chưa có code signing certificate.  
 User click "More info" → "Run anyway" là xong.  
 Để loại bỏ hoàn toàn: mua EV Code Signing Certificate (~$300/năm).

### Auto-update không hoạt động

- Kiểm tra GitHub Release có file `latest.yml` không
- Kiểm tra `package.json > build > publish > owner` và `repo` đúng chưa
- Log của electron-updater ở: `%APPDATA%\Rewards Tool\logs\main.log`

### GitHub Actions fail

- Vào **Actions tab** → click vào run đỏ → xem log bước nào lỗi
- Lỗi thường gặp: thiếu `assets/icon.ico`, TypeScript compile error
