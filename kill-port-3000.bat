@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM kill-port-3000.bat
REM Kill processes using port 3000
REM ==============================================================================

echo.
echo ========================================
echo   Kill Port 3000 Process
echo ========================================
echo.

echo [INFO] Searching for processes on port 3000...
echo.

set "found=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    set "found=1"
    echo [INFO] Killing PID %%a...
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] PID %%a killed
    ) else (
        echo [FAIL] PID %%a kill failed
    )
)

if "!found!"=="0" (
    echo [INFO] No process found on port 3000
)

echo.
echo ========================================
echo   Done
echo ========================================
endlocal
pause
