@echo off
title Earth Engine Authentication
cd /d "%~dp0set-query-ai\backend"

echo ========================================================
echo   Authorizing Google Earth Engine...
echo   A browser window will open to sign in with Google.
echo ========================================================

call venv\Scripts\activate.bat

echo Running Earth Engine authentication...
call venv\Scripts\earthengine.exe authenticate

echo.
echo ========================================================
echo   Authentication complete!
echo   You can now close this window, return to your browser,
echo   and click 'Get Imagery' again.
echo ========================================================
pause
