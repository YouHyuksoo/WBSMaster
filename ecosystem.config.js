/**
 * @file ecosystem.config.js
 * @description
 * PM2 프로세스 관리 설정 파일
 * Windows 환경에서 Next.js 서버를 실행합니다.
 *
 * 사용법:
 * - 시작: pm2 start ecosystem.config.js
 * - 재시작: pm2 restart wbs-master
 * - 중지: pm2 stop wbs-master
 * - 로그: pm2 logs wbs-master
 */
module.exports = {
  apps: [
    {
      name: "wbs-master",
      // Windows에서는 next를 직접 실행
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "C:\\project\\WBSMaster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // 재시작 설정
      watch: false,
      max_memory_restart: "1G",
      // 로그 설정
      error_file: "C:\\project\\WBSMaster\\logs\\error.log",
      out_file: "C:\\project\\WBSMaster\\logs\\out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // 재시작 정책
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
    },
  ],
};
