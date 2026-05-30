@echo off
cd /d "%~dp0"

echo Dang khoi dong Web UI...
echo =========================================
echo    BING REWARDS AUTO SEARCH TOOL v9.0
echo    Giao dien web: http://localhost:3789
echo =========================================

rem Khoi dong server nen (Express + WebSocket)
start "Reward Server" /B cmd /c "npm run web > server.log 2>&1"

rem Doi server khoi dong (3 giay)
timeout /t 3 /nobreak >nul

rem Mo Edge khong dung profile (--inprivate + no-profile-directory)
rem de khong bi tinh la 1 profile va khong bi dong khi taskkill
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --inprivate ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-background-mode ^
  "http://localhost:3789"

echo Server dang chay. Dong cua so nay se dung server.
pause
taskkill /F /FI "WINDOWTITLE eq Reward Server*" >nul 2>&1
