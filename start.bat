@echo off
title SatQuery AI Launcher
echo ======================================================
echo   Launching SatQuery AI (Backend + Frontend)
echo ======================================================

REM 1. Start Backend in its own window
start "SatQuery AI - Backend (Port 8000)" cmd /c "%~dp0set-query-ai\backend\run_backend.bat"

REM 2. Start Frontend in its own window
start "SatQuery AI - Frontend (Port 5173)" cmd /c "%~dp0set-query-ai\frontend\run_frontend.bat"

REM 3. Wait for servers to initialize
echo Waiting for servers to initialize...
ping -n 5 127.0.0.1 >nul

REM 4. Open the single link directly in the browser
echo Opening http://localhost:5173...
start http://localhost:5173

echo ======================================================
echo   SatQuery AI is running!
echo   Single Link: http://localhost:5173
echo ======================================================
