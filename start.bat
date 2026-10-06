@echo off
chcp 65001 > nul
title InternLink - Khoi Dong Docker
echo =====================================================================
echo           KHOI DONG HE THONG INTERNLINK (DOCKER)
echo =====================================================================
echo.

:: 1. Kiem tra Docker Engine
echo [1/2] Kiem tra Docker Engine...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker Engine chua san sang. Hay khoi dong Docker service roi chay lai.
    pause
    exit /b 1
)
echo [OK] Docker Engine da san sang!
echo.

:: 2. Bat cac Docker container
echo [2/2] Bat cac Docker container (Database, API, Frontend)...
cd /d "%~dp0"
docker compose up -d
if %errorlevel% neq 0 (
    echo [!] Khong the khoi dong Docker Compose. Kiem tra log va cau hinh .env.
    pause
    exit /b 1
)
echo [OK] Cac container da chay thanh cong!
echo.

echo =====================================================================
echo   Truy cap bang domain: http://internlink.duckdns.org:8000
echo   Truy cap bang IP:     http://171.246.98.49:8000
echo =====================================================================
echo.
docker compose ps
pause
