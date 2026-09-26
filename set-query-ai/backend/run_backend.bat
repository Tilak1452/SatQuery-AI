@echo off
title SatQuery AI - Backend (Port 8000)
cd /d "%~dp0"

echo ======================================================
echo   Starting SatQuery AI Backend on port 8000...
echo ======================================================

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found, creating one...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing requirements...
    pip install -r requirements.txt
)

echo Starting Uvicorn...
python -m uvicorn app.main:app --reload --port 8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend crashed or failed to start.
    echo Check the error message above.
    pause
)
