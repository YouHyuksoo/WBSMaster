# 2026-11-11 운영 배포 실패 (npm 12 lock 검사) · 미완료 기록

- 기준: origin/main `8278168` (push 범위 `5841bb6..8278168`, 다른 세션 커밋 `2dbc297` 포함)
- Actions run 42970953369 실패: `Validate lock file sync`(npm ci) 단계
  - 원인: 운영 서버 npm 12.0.2 는 `@emnapi/runtime@1.11.3`, `@emnapi/core@1.11.3` 가 lock 에 없다고 거부한다.
    로컬 npm 11.6.2 의 pre-push `npm ci --dry-run` 은 통과한다. `npx npm@12.0.2 ci --dry-run` 으로 로컬에서 재현했다.
  - lock 변경은 `2dbc297`(AI 채팅 업무 등록, mammoth · pdf-parse · jszip 추가)에서 들어왔다.
- 영향: 워크플로가 PM2 를 먼저 멈춘 뒤 npm ci 에서 실패해 운영이 502 가 됐다.
  같은 날 15:2x 에 남아 있던 직전 빌드(.next, `5841bb6`)로 `pm2 start ecosystem.config.js` 해 200 으로 복구했다.
  운영 디스크의 코드는 `8278168` 이지만 실행 중인 빌드는 `5841bb6` 이다.
- 남은 일 (결정 필요)
  1. `2dbc297` 의 마이그레이션 `20261111120000_chat_intake`(새 테이블 3개 + chat_histories 칼럼)를 운영 DB 에 적용할지
     (구현 보고서 `2026-11-11-chat-intake-implementation.md`: 운영 DB 미적용)
  2. lock 을 npm 12 기준으로 다시 만들기 (`npx npm@12.0.2 install --package-lock-only`)
  3. 워크플로 재발방지: PM2 중단 전에 lock 검사(`npm ci --dry-run`)를 먼저 돌려, 실패해도 운영이 내려가지 않게 하기
- 1~2 전에 main 을 다시 push 하면 같은 단계에서 운영이 다시 내려간다.
