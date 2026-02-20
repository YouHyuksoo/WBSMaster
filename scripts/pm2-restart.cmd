@echo off
:: PM2 재시작 스크립트 (GitHub Actions에서 schtasks로 호출)
:: 주의: pm2 kill 사용 금지! (같은 서버의 HANES 등 다른 프로젝트에 영향)
set PM2_HOME=C:\Users\Administrator\.pm2
cd /d C:\Project\WBSMaster
pm2 delete wbs-master 2>nul
timeout /t 2 /nobreak >nul
pm2 start ecosystem.config.js --update-env
pm2 save
