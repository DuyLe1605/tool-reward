/**
 * @fileoverview Electron preload script — chạy trong renderer context trước khi web page load.
 *
 * contextIsolation = true nên preload là cầu nối an toàn duy nhất giữa
 * renderer (React app) và main process.
 *
 * Hiện tại app dùng http://127.0.0.1:3789 nên không cần expose API nào.
 * File này chỉ để placeholder đúng chuẩn bảo mật Electron.
 */

// Không expose gì — React app giao tiếp qua HTTP/WebSocket với Express server
