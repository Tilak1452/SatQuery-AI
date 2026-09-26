@echo off
title Earth Engine Authentication
cd /d "%~dp0set-query-ai\backend"

echo ========================================================
echo   Authorizing Google Earth Engine...
echo   A browser window will open to sign in with Google.
echo ========================================================

call venv\Scripts\activate.bat
python -c "import ee; ee.Authenticate()"

echo.
echo ========================================================
echo   Authentication complete! You can now close this window
echo   and click 'Retry' on the map.
echo ========================================================
pause
