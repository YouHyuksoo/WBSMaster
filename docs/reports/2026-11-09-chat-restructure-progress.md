# AI 채팅 재구성 진행 기록 (미완료)

- 날짜: 2026-11-09
- 계획: `docs/plans/2026-11-09-chat-restructure.md`
- 설계: `docs/specs/2026-11-09-chat-restructure-design.md`
- 작업 기록(ledger): `.superpowers/sdd/2026-11-09-chat-restructure/progress.md` (git 제외)
- 커밋: master 에 커밋함, push 는 하지 않음 (사용자가 결정). 다른 세션의 커밋되지 않은 변경이 같은 작업 트리에 있다.

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
| 17 | 확인 카드, 후보 선택, "대체 모델로 답함" 배지, 채팅 모델 배지 | 컴포넌트 테스트 + EGO 브라우저 확인 (2026-11-09) |
| 보안 | `POST /api/chat` 프로젝트 권한 확인 | route-auth 테스트 |

전체 테스트 79 파일 / 409개 통과, `npx tsc --noEmit` 0 오류 (2026-11-09 기준).

브라우저 확인 (로컬 dev 서버, 회사 ChatGPT): 설정 화면 "연결됨" 표시·저장, 채팅 "지연된 WBS" → "그중 레벨2만" 맥락, "강승훈에게 … TASK 등록" 확인 카드(담당·제목·마감 금요일) → [취소] 시 DB 변경 없음(tasks 0건, 제안 CANCELLED). 확인 중 찾은 화면 결함 3건(배지 "설정 필요", 요약 문장 중복, 제공자 버튼 넘침)은 f227eb0 에서 고침. 후보 선택 버튼은 프로젝트에 동명이인이 없어 단위 테스트로만 확인.

실계정 스모크(로컬 DB 조회만): 잡담은 도구 없이, 진척률은 화면과 같은 값, "그중 레벨2만" 맥락 이어받음, "유혁스"→유혁수, 위치관리 고객요구사항 4건.

## 확장: 채팅에서 메뉴별 등록·수정·삭제 (2026-11-09~10, 사용자 승인 범위)

| 커밋 | 내용 | 검증 |
|---|---|---|
| 3e9beda | WBS 담당자 배정·상태·진행률·기간 일괄 수정 (`propose_update_wbs`) | 테스트 + 브라우저 확인 카드 |
| 29a5efe | 공통 도구 `propose_create_record` · `propose_update_record` · `propose_delete_records`. 고객요구사항·업무협조·마일스톤·일정·인터뷰·공정설비·문서함(정보만)·진도 태스크·리스크·AS-IS 총괄 항목 등록·수정·삭제, WBS 등록·삭제, TASK·이슈·고객이슈·협의요청 삭제. 확인 API 가 같은 요청에서 화면 API 핸들러를 직접 호출 (쿠키·권한·채번·알림이 화면과 같음). 삭제는 빨간 카드·최대 20건·함께 지워지는 건수 안내 | 메뉴 정의↔스키마·라우트 파일 대조 테스트, 브라우저: 마일스톤 등록→수정→삭제 DB 반영 확인 |
| 7f2c73c | 확인 카드 결함: 수정 제안에 [등록] 버튼 → op 로 [등록]/[수정]/[삭제], 영문 Enum(IN_PROGRESS) → 한글 라벨 (`Record<Enum, string>` 라 Enum 추가 시 타입 오류) | 회귀 테스트 + 브라우저 재확인 |
| e1d907e | 주간 업무보고: `list_weekly_report`, `propose_create/update_weekly_item`, `propose_delete_weekly_items`. 주차는 화면처럼 프로젝트 시작일 기준, 그 주 보고서가 없으면 확인 시 먼저 생성(409 면 기존 사용) | 테스트 + 브라우저: 3주차 항목 추가→진행률 수정→삭제, 화면 주차와 일치. 확인 중 카드 날짜가 UTC 로 하루 당겨지던 결함 고침 |
| 8d16c68 | 회의록: 공통 도구 `meeting_minute`(머리 정보, 등록 때 contents), `list_meeting_minutes`, `propose_update_meeting_items`(내용 항목 추가·변경·삭제) | 테스트 + 브라우저: 등록→내용 변경·추가→장소 수정→삭제, 화면 목록 확인 |

제외(승인 범위): 사용자·프로젝트 관리, 백업, 설정, Slack, 페르소나, 알림, 업무기능추적표, AS-IS 상세 분석, 엑셀 가져오기. 주간보고는 본인 보고서의 항목만 다룬다 (보고서 제출·취합 보고서 제외).

브라우저 확인에 쓴 데이터(마일스톤, 주간보고와 항목, 회의록)는 모두 지웠다. 2026-11-10 전체 테스트 실패 3건(route-auth 의 `equipment/[id]/interfaces GET`, project-display 의 `ProjectCarousel.tsx`, pastel-ratchet 의 `WbsStatsBar.tsx`)은 다른 세션이 작업 중인 미커밋 파일에서 나온 것이다.

## 남은 작업

1. Task 18: 평가 픽스처(`wbsmaster_eval` DB, 생성 승인됨)와 평가 스크립트, 실행.
2. 최종 전체 리뷰.
3. 알려진 작은 문제: 채팅 기록을 다시 불러오면 확인 카드가 안 보임(pendingActionId 만 저장), "지연된 WBS" 질문에서 레벨별로 여러 번 조회해 느림(약 27초).

## 운영 배포 시

- `prisma db push`: `ai_settings.chatgptModel`(기본 gpt-6.1-sol), `ai_settings.provider` 기본값 `chatgpt`, `chat_histories.toolSummary`·`pendingActionId`, 새 테이블 `chat_pending_actions`.
- 서버 환경 변수 `CHATGPT_AUTH_FILE`(저장소 밖, 서비스 계정만 접근), 선택 `CHAT_FALLBACK_*`. 관리자 화면에서 회사 계정으로 연결. 개발 PC 토큰 파일 복사 금지 (refresh token 1회용).
