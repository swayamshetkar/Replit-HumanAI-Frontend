# Start Both Servers - PersonaAI Frontend + Mock Backend
# Run this script: .\start.ps1

Write-Host "🚀 Starting PersonaAI servers..." -ForegroundColor Cyan

# Kill any existing node processes
Write-Host "Cleaning up old processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep -Seconds 1

# Start mock backend in background
Write-Host "Starting mock backend on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile -Command `"cd '$PSScriptRoot'; node mock-backend.js`"" -WindowStyle Minimized
Start-Sleep -Seconds 2

# Start frontend server
Write-Host "Starting frontend server on port 8080..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile -Command `"cd '$PSScriptRoot'; node server.js`"" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "`n✅ Both servers started!" -ForegroundColor Green
Write-Host "`nOpen these URLs in your browser:" -ForegroundColor Cyan
Write-Host "  Original UI:   http://localhost:8080/" -ForegroundColor White
Write-Host "  PersonaAI UI:  http://localhost:8080/app" -ForegroundColor White
Write-Host "`nMock Backend:    http://localhost:3000/" -ForegroundColor Gray
Write-Host "`nPress any key to stop servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`nStopping servers..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null | Out-Null
Write-Host "✅ Servers stopped." -ForegroundColor Green
