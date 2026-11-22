@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   Kinusaiga Digital Pattern Store - One-Click Update
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] Running Catalog Importer & Sync...
call npm.cmd run import
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Import failed. Please inspect the error messages above.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Building Production Static Site (Astro)...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Verifying Public Assets Security...
call npm.cmd run verify
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Verification failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   Update completed successfully!
echo   Report: reports\import-report.md
echo   Static site is ready in 'dist' folder.
echo ============================================================
echo.
echo Optional actions:
echo   - To preview locally in browser: npm run preview
echo   - To deploy automatically to Hostinger via FTP: npm run deploy
echo.
pause
