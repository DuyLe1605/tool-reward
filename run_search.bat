@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Đang khởi động Web UI...
echo =========================================
echo    BING REWARDS AUTO SEARCH TOOL v9.0
echo    Giao diện web: http://localhost:3789
echo =========================================

rem Khởi động server nền (Express + WebSocket)
start "Reward Server" /B cmd /c "npm run web > server.log 2>&1"

rem Đợi server khởi động (3 giây)
timeout /t 3 /nobreak >nul

rem Mở Edge không dùng profile (--inprivate)
rem để không bị tính là 1 profile và không bị đóng khi tắt
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --inprivate ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-background-mode ^
  "http://localhost:3789"

echo.
echo Server đang chạy. Cửa sổ này sẽ tự đóng khi thoát ứng dụng.
echo (Hoặc nhấn phím bất kỳ để đóng ngay)
echo.

:wait_loop
timeout /t 2 /nobreak >nul
netstat -ano | find ":3789" | find "LISTENING" >nul 2>&1
if errorlevel 1 goto :server_stopped
goto :wait_loop

:server_stopped
echo.
echo Server đã dừng. Đóng cửa sổ...
timeout /t 1 /nobreak >nul
exit