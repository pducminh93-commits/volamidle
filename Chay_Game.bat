@echo off
chcp 65001 >nul
title Vo Lam IDLE - May Chu Local Offline 100%
cd /d "%~dp0"

echo ========================================================
echo        VO LAM IDLE - PHIEN BAN OFFLINE THUAN 100%%
echo ========================================================
echo.

REM --- 1. Tim Node.js: PATH truoc, sau do cac vi tri cai dat pho bien ---
set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%APPDATA%\npm\node.exe" set "NODE_EXE=%APPDATA%\npm\node.exe"
if not defined NODE_EXE goto :no_node

echo Dung Node: %NODE_EXE%
"%NODE_EXE%" -v

REM --- 2. Cong 8080 da bi chiem? (thuong la cua so server cu con mo) ---
set "BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do set "BUSY=%%p"

if not defined BUSY goto :run

echo.
echo [CANH BAO] Cong 8080 dang bi chiem boi PID %BUSY%.
echo   Thuong la cua so "Vo Lam IDLE" truoc do chua dong.
echo   Bam Y de tat PID %BUSY% roi chay tiep, N de thoat.
choice /c YN /n /m "Tat tien trinh dang giu cong 8080? [Y/N] "
if errorlevel 2 exit /b 1
taskkill /F /PID %BUSY% >nul 2>nul
ping -n 2 127.0.0.1 >nul

:run
echo.
echo Dang khoi dong may chu cuc bo tai cong 8080...
echo Game se tu dong mo trong trinh duyet cua ban.
echo.
echo (Luu y: Giu cua so mau den nay trong suot luc choi game)
echo.
start "" "http://localhost:8080/game.html"
"%NODE_EXE%" local_server.js
echo.
echo May chu da dung.
pause
exit /b 0

:no_node
echo [LOI] Khong tim thay Node.js.
echo.
echo   - Cai Node.js LTS tu https://nodejs.org/  roi chay lai file nay.
echo   - Hoac them thu muc cai Node vao PATH cua Windows.
echo.
pause
exit /b 1
