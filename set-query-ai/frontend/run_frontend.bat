@echo off
title SatQuery AI - Frontend (Port 5173)
cd /d "%~dp0"

echo ======================================================
echo   Starting SatQuery AI Frontend on port 5173...
echo ======================================================

call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend failed to start.
    pause
)
