@echo off
title Earth Engine Authentication
cd /d "%~dp0set-query-ai\backend"

echo ========================================================
echo   Clearing old Google Earth Engine session...
echo ========================================================

if exist "%USERPROFILE%\.config\earthengine\credentials" (
    del /f /q "%USERPROFILE%\.config\earthengine\credentials"
)

echo ========================================================
echo   Authorizing Google Earth Engine...
echo   A browser window will open.
echo   IMPORTANT: Choose or sign in with your COLLEGE account!
echo ========================================================

call venv\Scripts\activate.bat

echo Running Earth Engine authentication with --force...
call venv\Scripts\earthengine.exe authenticate --force

echo.
echo ========================================================
echo   Authentication complete!
echo   You can now close this window, return to your browser,
echo   and click 'Get Imagery' again.
echo ========================================================
pause
