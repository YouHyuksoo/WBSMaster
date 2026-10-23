/**
 * @file ecosystem.config.js
 * @description
 * PM2 프로세스 관리 설정 파일
 * Windows 환경에서 Next.js 서버를 실행합니다. (운영: 지성 IDC 서버, 포트 3020)
 *
 * 사용법:
 * - 시작: pm2 start ecosystem.config.js
 * - 재시작: pm2 restart wbs-master
 * - 중지: pm2 stop wbs-master
 * - 로그: pm2 logs wbs-master
 */
const path = require("path");

/** 서비스 포트 (IIS 리버스 프록시 wbs.jisheng.co.kr → 3020) */
const PORT = 3020;

module.exports = {
  apps: [
    {
      name: "wbs-master",
      // Windows에서는 next를 직접 실행
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${PORT}`,
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT,
      },
      // 재시작 설정
      watch: false,
      max_memory_restart: "1G",
      // 로그 설정
      error_file: path.join(__dirname, "logs", "error.log"),
      out_file: path.join(__dirname, "logs", "out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // 재시작 정책
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
    },
  ],
};
