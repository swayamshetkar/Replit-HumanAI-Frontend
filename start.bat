@echo off
echo Starting PersonaAI servers...

REM Kill old processes
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak >nul

REM Start mock backend
echo Starting mock backend...
start /min cmd /c "node mock-backend.js"
timeout /t 2 /nobreak >nul

REM Start frontend
echo Starting frontend...
start /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   SERVERS STARTED
echo ============================================
echo   Original UI:   http://localhost:8080/
echo   PersonaAI UI:  http://localhost:8080/app
echo   Mock Backend:  http://localhost:3000/
echo ============================================
echo.
echo Press any key to stop servers...
pause >nul

echo Stopping servers...
taskkill /F /IM node.exe 2>nul
echo Done.
