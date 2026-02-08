@echo off
:: PM2 재시작 스크립트 (GitHub Actions에서 schtasks로 호출)
set PM2_HOME=C:\Users\Administrator\.pm2
cd /d C:\Project\WBSMaster
pm2 kill 2>nul
timeout /t 2 /nobreak >nul
pm2 start ecosystem.config.js --update-env
pm2 save
