@echo off
title Vouch 2.0 Dev Server
echo ========================================
echo  Vouch 2.0 - Starting Dev Server
echo ========================================
echo.

cd /d "%~dp0"

:: Find npm — try common Node install locations
where npm >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] npm not found on PATH.
  echo.
  echo Please open a terminal manually and run:
  echo   cd "%~dp0"
  echo   npm run dev
  echo.
  pause
  exit /b 1
)

echo Node version:
node --version
echo npm version:
npm --version
echo.

if not exist node_modules (
  echo Installing dependencies...
  npm install
  if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo  App: http://localhost:8080
echo  Press Ctrl+C to stop
echo.
cmd /k npm run dev
