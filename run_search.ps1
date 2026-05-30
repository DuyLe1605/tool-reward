# BING REWARDS AUTO SEARCH TOOL v9.0 — Launcher
# Chạy: nhấp đúp vào file này, hoặc PowerShell -File run_search.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Đặt encoding UTF-8 cho console để hiển thị tiếng Việt đúng
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "   BING REWARDS AUTO SEARCH TOOL v9.0" -ForegroundColor Cyan
Write-Host "   Giao diện web: http://localhost:3789" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

# Khởi động server nền
Write-Host "Đang khởi động server..." -ForegroundColor Yellow
$server = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run web > server.log 2>&1" `
    -WorkingDirectory $PSScriptRoot `
    -WindowStyle Hidden `
    -PassThru

# Đợi server sẵn sàng
Write-Host "Đợi server khởi động (3 giây)..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3

# Mở Edge InPrivate
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
Start-Process $edgePath -ArgumentList "--inprivate --no-first-run --no-default-browser-check --disable-background-mode http://localhost:3789"

Write-Host ""
Write-Host "Server đang chạy." -ForegroundColor Green
Write-Host "Cửa sổ này sẽ tự đóng khi bạn thoát ứng dụng từ giao diện web." -ForegroundColor Green
Write-Host ""

# Chờ đến khi server dừng (port 3789 không còn LISTENING)
while ($true) {
    Start-Sleep -Seconds 2
    $listening = netstat -ano | Select-String ":3789" | Select-String "LISTENING"
    if (-not $listening) { break }
}

Write-Host ""
Write-Host "Server đã dừng. Đóng cửa sổ..." -ForegroundColor Red
Start-Sleep -Seconds 1
