# Microsoft Rewards Auto Search Tool

Tool tự động tìm kiếm trên Bing để tích điểm Microsoft Rewards, sử dụng dữ liệu từ Wikipedia tiếng Việt.

## Tính năng
- **Dữ liệu ngẫu nhiên**: Lấy bài viết ngẫu nhiên từ Wikipedia để làm từ khóa tìm kiếm.
- **Xử lý chuỗi thông minh**: Tách từ và gộp cụm từ theo logic yêu cầu (cắt mảng 10-150 và 180-300).
- **Mô phỏng người dùng**: Gõ phím có độ trễ, cuộn trang, và chờ đợi ngẫu nhiên giữa các lần tìm kiếm.
- **Hỗ trợ Profile Edge**: Sử dụng Profile thực tế của bạn để giữ trạng thái đăng nhập.

## Cài đặt
1. Đảm bảo bạn đã cài đặt [Node.js](https://nodejs.org/).
2. Mở terminal tại thư mục này.
3. Cài đặt thư viện:
   ```bash
   npm install
   ```

## Cấu hình (Quan trọng)
Mở file `index.js` và kiểm tra các thông số trong `CONFIG`:
- `userDataDir`: Đường dẫn đến dữ liệu người dùng của Edge. Mặc định tool sẽ cố gắng lấy từ `%LOCALAPPDATA%`.
- `profileName`: Tên profile bạn đang dùng (mặc định là `Default`).

**LƯU Ý**: Bạn phải **ĐÓNG TRÌNH DUYỆT EDGE** trước khi chạy tool nếu sử dụng Profile đang dùng. Nếu không, Playwright sẽ không thể truy cập vào profile đó.

## Cách chạy
Chạy lệnh sau trong terminal:
```bash
npm start
```

## Lên lịch tự động (Windows Task Scheduler)
1. Mở **Task Scheduler**.
2. Chọn **Create Basic Task**.
3. Đặt tên (ví dụ: `AutoRewards`).
4. Chọn thời gian chạy (Daily).
5. Action: **Start a Program**.
6. Program/script: `node`.
7. Add arguments: `index.js` (hoặc đường dẫn tuyệt đối đến file).
8. Start in: Đường dẫn thư mục chứa tool này.
