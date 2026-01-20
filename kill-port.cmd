@echo off
echo 포트 3000 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo PID %%a 종료
    taskkill /F /PID %%a >nul 2>&1
)
echo .next/dev/lock 파일 삭제 중...
del /f /q "%~dp0.next\dev\lock" 2>nul
echo 완료!
pause
