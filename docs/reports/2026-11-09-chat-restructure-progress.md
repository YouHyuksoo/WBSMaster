# AI 채팅 재구성 진행 기록 (미완료)

- 날짜: 2026-11-09
- 계획: `docs/plans/2026-11-09-chat-restructure.md`
- 설계: `docs/specs/2026-11-09-chat-restructure-design.md`
- 작업 기록(ledger): `.superpowers/sdd/2026-11-09-chat-restructure/progress.md` (git 제외)
- 커밋: 하지 않음 (사용자 요청 시 커밋). 다른 세션(d9, 12)의 커밋되지 않은 변경이 같은 작업 트리에 있다.

## 끝난 작업 (Task 1~16, 17 일부)

| Task | 내용 | 검증 |
|---|---|---|
| 1 | Codex OAuth 상수, 프로브. 회사 계정에서 `gpt-6.1-sol` 텍스트·도구 호출 확인 (`gpt-5.5` 는 미지원) | 실계정 프로브, fixture 3건 |
| 2 | 채팅 SQL 읽기 전용(SELECT/WITH, READ ONLY 트랜잭션), TASK INSERT 폴백 삭제 | 로컬 PG 에서 UPDATE 25006 거절 |
| 3 | 채팅 스키마 22개 테이블로 정리, 기본 SQL 프롬프트 읽기 전용화 | @@map 대조 테스트 |
| 4·5 | ChatGPT 토큰 저장소, 도구 호출 클라이언트(ChatGPT·OpenAI·OpenRouter), 대체 제공자 | 단위 테스트 + 실계정 스모크 |
| 6 | 관리자 ChatGPT 연결 API·화면, 설정 화면 "회사 ChatGPT" 선택지 | 라우트·컴포넌트 테스트 |
| 7~11 | 도구 20개(사람 퍼지 매칭, WBS 진척률, 조회 7종, 코드 조회, 자유 SQL), 한국어→Enum 사전 | 테스트 + 로컬 DB 읽기 실행 |
| 9 | WBS 일정 통계를 화면·채팅 공용 함수로 | 손계산 픽스처 |
| 12 | 이슈·고객이슈·협의요청·TASK 쓰기 로직을 서비스 계층으로 (라우트가 서비스 호출) | 서비스 테스트 |
| 13 | 쓰기 제안(propose_*)·확인/취소 API (본인·프로젝트·1회·30분 만료) | 라우트 테스트 |
| 14·15 | 최근 6턴 대화 맥락, 에이전트 루프, 안전 규칙 우선 시스템 프롬프트 | 테스트 |
| 16 | 채팅 API 에이전트 분기 (도구 지원 제공자 + 프로젝트 선택 시), AI 설정 없으면 회사 ChatGPT | 테스트 + 실계정 스모크 |
| 17 (일부) | 확인 카드, 후보 선택, "대체 모델로 답함" 배지 | 컴포넌트 테스트. 브라우저 확인 안 함 |
| 보안 | `POST /api/chat` 프로젝트 권한 확인 | route-auth 테스트 |

전체 테스트 78 파일 / 401개 통과, `npx tsc --noEmit` 0 오류 (2026-11-09 기준).

실계정 스모크(로컬 DB 조회만): 잡담은 도구 없이, 진척률은 화면과 같은 값, "그중 레벨2만" 맥락 이어받음, "유혁스"→유혁수, 위치관리 고객요구사항 4건.

## 남은 작업

1. Task 17 브라우저 확인: dev 서버가 회사 ChatGPT 를 쓰려면 `.env.local` 에 `CHATGPT_AUTH_FILE` 이 있어야 하고, 새 Prisma 모델 반영을 위해 dev 서버 재시작이 필요하다 (3000 포트 서버는 이 세션이 띄운 것이 아님).
2. Task 18: 평가 픽스처(`wbsmaster_eval` DB, 생성 승인됨)와 평가 스크립트, 실행.
3. 최종 전체 리뷰.

## 운영 배포 시

- `prisma db push`: `ai_settings.chatgptModel`(기본 gpt-6.1-sol), `ai_settings.provider` 기본값 `chatgpt`, `chat_histories.toolSummary`·`pendingActionId`, 새 테이블 `chat_pending_actions`.
- 서버 환경 변수 `CHATGPT_AUTH_FILE`(저장소 밖, 서비스 계정만 접근), 선택 `CHAT_FALLBACK_*`. 관리자 화면에서 회사 계정으로 연결. 개발 PC 토큰 파일 복사 금지 (refresh token 1회용).
