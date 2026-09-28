@echo off
chcp 65001 > nul
title InternLink - Khoi Dong He Thong
echo =====================================================================
echo           KHOI DONG HE THONG INTERNLINK (DOCKER + NGROK)
echo =====================================================================
echo.

:: 1. Kiem tra va khoi dong Docker Engine neu chua bat
echo [1/3] Kiem tra Docker Desktop...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker Desktop chua chay. Dang tu dong bat Docker Desktop...
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    echo Dang cho Docker Engine khoi dong (vui long doi giay lat)...
    :wait_docker
    timeout /t 5 /nobreak > nul
    docker info > nul 2>&1
    if %errorlevel% neq 0 goto wait_docker
)
echo [OK] Docker Engine da san sang!
echo.

:: 2. Bat cac Docker container
echo [2/3] Bat cac Docker container (Database, API, Frontend)...
cd /d "%~dp0"
docker compose up -d
echo [OK] Cac container da chay thanh cong!
echo.

:: 3. Chay Ngrok voi Static Domain co dinh
echo [3/3] Dang bat Ngrok chia se mang ngoai...
echo.
echo =====================================================================
echo   🌐 LINK TRUY CAP CO DINH (KHONG BAO GIO DOI):
echo   👉 https://unwithholding-lieselotte-unapprovingly.ngrok-free.dev
echo =====================================================================
echo.
echo (Luu y: Giu cua so nay de duy tri ket noi ra ngoai mang. Nhan Ctrl+C de dung)
echo.

"%LOCALAPPDATA%\ngrok\ngrok.exe" http 3000 --url unwithholding-lieselotte-unapprovingly.ngrok-free.dev
