@echo off
cd /d "%~dp0"
echo Đang đóng tất cả tiến trình Edge để tránh lỗi Profile...
taskkill /F /IM msedge.exe /T >nul 2>&1
echo Starting Microsoft Rewards Auto Search...
node index.js
echo Task completed.
pause
