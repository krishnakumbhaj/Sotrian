@echo off
REM Quick Start Script for Fraud Detection Chat (Windows)
REM Run this from the project root

echo ========================================
echo   Fraud Detection Chat - Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "Katalyst" (
    echo [ERROR] Katalyst folder not found
    echo Run this from the project root directory
    exit /b 1
)

if not exist "Models" (
    echo [ERROR] Models folder not found
    echo Run this from the project root directory
    exit /b 1
)

echo [INFO] Checking environment setup...
if not exist "Katalyst\.env.local" (
    echo [WARN] Katalyst\.env.local not found
    echo        Copy .env.example to .env.local and configure
)

if not exist "Models\.env" (
    echo [WARN] Models\.env not found  
    echo        Create Models\.env with ALLOWED_ORIGINS
)
echo.

echo [INFO] Starting FastAPI server (port 8000)...
cd Models
start "FastAPI Server" cmd /k python fastapi_server.py
cd ..
timeout /t 3 /nobreak > nul
echo [OK] FastAPI starting...
echo.

echo [INFO] Starting Next.js server (port 3000)...
cd Katalyst
start "Next.js Server" cmd /k npm run dev
cd ..
timeout /t 5 /nobreak > nul
echo [OK] Next.js starting...
echo.

echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo   Chat UI:  http://localhost:3000/chat
echo   FastAPI:  http://localhost:8000/docs
echo.
echo Next steps:
echo   1. Navigate to http://localhost:3000/chat
echo   2. Click 'Configure API Key'
echo   3. Add your Google Gemini API key
echo   4. Start detecting fraud!
echo.
echo To stop servers: Close the command windows
echo.
pause
