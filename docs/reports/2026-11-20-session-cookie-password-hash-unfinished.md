# 2026-11-20 로그인 세션 서명 · 비밀번호 해시 — 미완료 기록

## 한 일 (커밋 전, 작업 폴더에만 있음)
- 로그인 쿠키를 서명된 세션 토큰으로 바꿈: `src/lib/session-cookie.ts` (쿠키 이름 `wbs_session`, 예전 `userId` 쿠키는 읽지 않고 지움)
- 비밀번호를 scrypt 해시로 저장 · 확인: `src/lib/password.ts`. 예전 평문 행은 로그인에 성공하면 그 자리에서 해시로 바뀜
- 배포 스크립트가 A 의 `.env.local` 에 32자 이상 `SESSION_SECRET` 이 없으면 빌드 전에 멈춤 (`scripts/deploy-blue-green.ps1`)
- 확인: `npx tsc --noEmit` 통과, `npx vitest run` 857 통과 · 20 건너뜀 · 파일 1개 실패(`src/lib/chat-suggestions.test.ts`, 이번 변경 전부터 실패)

## 배포 전에 해야 할 것
1. 운영 A 폴더(`D:\Project\WBSMaster\.env.local`)에 `SESSION_SECRET` 추가. 없으면 배포가 멈춘다 (서비스는 그대로)
2. 배포되면 모든 사용자가 한 번 다시 로그인해야 한다 (예전 쿠키 무효)

## 확인하지 못한 것
- 브라우저에서 실제 로그인 · 로그아웃 · 비밀번호 변경 (개발 서버를 띄우지 않았다. 라우트는 목(mock)으로만 확인)
- 배포 스크립트의 `SESSION_SECRET` 점검은 문법 검사와 같은 패턴의 단독 실행으로만 확인 (실제 배포에서는 안 돌려 봄)

## 남은 데이터 작업
- 로그인하지 않는 계정의 평문 비밀번호: `npx tsx scripts/hash-passwords.ts` (건수만) → `--apply`.
  로컬(`127.0.0.1:55432/wbsmaster`)은 미리보기만 돌렸고 7명 모두 평문이다. 운영은 돌리지 않았다
- 예전에 만든 DB 백업 파일(.sql)에는 평문 비밀번호가 그대로 있다

## 이번에 고치지 않은 것 (리뷰 지적)
- ~~AS-IS 분석 목록 · 생성 라우트 14개의 프로젝트 멤버 확인 누락~~ 같은 날 고침 (아래 "2차")
- ~~Slack 설정 관리자 제한 없음, `slack-settings/test` 의 임의 URL 호출~~ 같은 날 고침
- ~~채팅 SQL 가드가 `ai_settings` API 키 · `slack_settings.webhookUrl` 조회를 막지 않음~~ 같은 날 고침
- `prisma/schema.prisma` 의 `password @default("admin123")`, 관리자가 비밀번호 없이 만든 계정의 기본 비밀번호 `admin123`
- ~~로그인 시도 횟수 제한 없음~~ 같은 날 고침

## 2차 (같은 날, 커밋 전)
- AS-IS 목록 · 생성 28개 핸들러에 `assertAsIsAccess` 추가 (`src/lib/as-is-access.ts`)
- Slack 설정 조회 · 저장 · 테스트 전송을 ADMIN 전용으로, 웹훅 주소는 `https://hooks.slack.com/` 만 (`isSlackWebhookUrl`)
- 채팅 SQL: `ai_settings` · `slack_settings` 를 빈 뷰로 가리고, 문자열 SQL 실행 함수(query_to_xml 등)를 거절
- 로그인 시도 제한 (`src/lib/login-throttle.ts`, 서버 메모리)
- pre-push 에 `npx vitest run` 추가, `chat-suggestions.test.ts` 실패 고침, 훅 순서 위반 5곳 · prefer-const 8곳 고침
- 확인: `npx tsc --noEmit` 통과, `npx vitest run` 914 통과 · 20 건너뜀 · 실패 0, ESLint 오류 168 → 155

## 2차에서 확인하지 못한 것 · 남긴 것
- 브라우저 확인 없음: Slack 설정 화면(비관리자 안내), 채팅 차트 · 마인드맵, WBS 일괄 배정 모달, 주간보고 주차 캐로셀 (훅 순서만 바꿈, tsc · lint 로만 확인)
- 채팅 SQL 의 뷰 가리기는 목(mock)으로만 확인. 실제 PostgreSQL 에서 빈 뷰 생성 · 조회는 돌려 보지 않았다
- 채팅 SQL 이 다른 프로젝트의 행을 읽는 것은 여전히 프롬프트와 결과 검사(projectId 칼럼이 있을 때만)에 의존한다. DB 역할 · 행 수준 보안 설계가 필요
- Slack 메뉴(SLACK)는 systemOnly 가 아니어서 권한을 받은 비관리자에게 화면은 보인다 (API 는 403)
- ESLint 오류 155건 (set-state-in-effect 52, no-explicit-any 29 등), 300줄 초과 파일 99개는 그대로
