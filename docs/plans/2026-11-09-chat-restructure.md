# AI 채팅 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (read and follow C:/Users/hsyou/.agents/skills/subagent-driven-development/SKILL.md) (recommended) or executing-plans (read and follow C:/Users/hsyou/.agents/skills/executing-plans/SKILL.md) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WBS Master AI 채팅을 "LLM이 도구를 골라 쓰는 구조"로 바꾼다. 대화 맥락, 사람 이름 퍼지 매칭, 화면과 같은 지표, 확인 후 쓰기, DB 수준 읽기 전용 SQL을 넣고, 회사 ChatGPT 구독 계정(OAuth)을 공용 LLM으로 붙인다.

**Architecture:** `POST /api/chat`가 최근 6턴의 맥락을 불러 에이전트 루프(`runAgent`)를 돌린다. LLM은 도구 레지스트리(`src/lib/chat-tools`)에서 읽기 도구를 바로 실행하거나, 쓰기 도구로 "제안(pending action)"을 만든다. 제안은 확인 API를 거쳐 서비스 계층(`src/lib/services`)으로 실행된다. 도구 호출을 지원하지 않는 제공자(Gemini, Mistral)는 기존 파이프라인을 유지하되, 읽기 전용 실행은 똑같이 적용한다.

**Tech Stack:** Next.js 16 App Router, Prisma 7(PrismaPg), PostgreSQL, Vitest(jsdom), TypeScript. LLM은 ChatGPT Codex Responses API(OAuth)와 OpenAI 호환 chat completions(OpenAI, OpenRouter)를 쓴다.

**Spec:** `docs/specs/2026-11-09-chat-restructure-design.md`

## Global Constraints

- 모든 새 파일 상단에 한국어 JSDoc(`@file`, `@description`, `초보자 가이드:`)을 단다. 파일당 200줄을 권장하고 300줄을 넘으면 나눈다.
- import는 `@/*` 별칭을 쓴다. 테스트는 소스 옆 `*.test.ts(x)`(Vitest)에 둔다.
- 인증은 `requireAuth()`, 프로젝트 권한은 `assertProjectAccess(projectId, user)`로 한다. 관리자 판정은 `user.role === "ADMIN"`이다.
- 도구는 서버가 주입한 `projectId`/`user`로만 동작한다. LLM 인자로 projectId를 받지 않는다.
- 쓰기는 `propose_*` 도구가 만든 제안을 사용자가 확인해야만 실행된다. LLM SQL로는 쓰지 않는다.
- 제안 만료는 30분, 맥락은 6턴, 에이전트 루프는 최대 6스텝이다.
- ChatGPT 토큰은 `CHATGPT_AUTH_FILE` 경로의 파일에만 둔다. DB, 로그, 응답, git에 남기지 않는다.
- 대체 제공자는 `CHAT_FALLBACK_PROVIDER`(`openai`|`openrouter`)와 그 키 환경 변수(`CHAT_FALLBACK_OPENAI_API_KEY`|`CHAT_FALLBACK_OPENROUTER_API_KEY`), 모델(`CHAT_FALLBACK_MODEL`)로 지정한다.
- 단위 테스트는 실제 LLM, 실제 DB, 사용자 실데이터를 쓰지 않는다(fetch와 prisma는 목으로 대체). 실제 LLM을 부르는 것은 Task 1 프로브와 Task 18 평가 스크립트뿐이고, 둘 다 사용자가 직접 실행한다.
- Prisma 모델을 바꾸면 `npx prisma generate`를 하고 `src/lib/api.ts`와 `src/hooks/use*.ts` 타입을 맞춘다. 개발 DB(로컬 55432) 반영은 `npx prisma db push`로 한다.
- 커밋 단계는 사용자가 커밋을 요청했을 때만 실행한다(전역 규칙). 메시지 형식은 `feat:`/`fix:`/`refactor:` 같은 접두사에 한국어 요약을 붙인다.
- 각 Task가 끝나면 `npx tsc --noEmit`와 `npx vitest run <해당 파일>`이 통과해야 한다.

## Review Focus

- 이미 확인했거나 취소한 제안을 다시 확인하는 경우: 두 번째 요청은 409로 거절하고 DB는 한 번만 바뀐다. → Task 13 테스트 `rejects double confirm`
- 같은 이름 후보가 두 명이고 점수가 비슷한 경우(최종무/최종우): 제안을 만들지 않고 후보 선택으로 응답한다. → Task 8 `ambiguous`, Task 13 `returns candidates instead of proposal`
- 다른 프로젝트 레코드의 코드나 id로 수정 제안이 오는 경우: 제안을 만들지 않거나 실행 단계에서 404로 끝나고, DB는 바뀌지 않는다. → Task 10 `code of another project returns null`, Task 12 `... rejects other project`, Task 13 `rejects target record of another project`
- 자유 SQL 결과에 다른 프로젝트 행이 섞이는 경우: 결과를 버리고 거절 메시지를 낸다. → Task 11 `rejects foreign project rows`
- ChatGPT 토큰 갱신이 동시에 두 번 일어나는 경우: refresh 요청은 한 번만 나가고 둘 다 새 토큰을 받는다. → Task 4 `single-flight refresh`
- LLM이 존재하지 않는 도구 이름이나 스키마에 안 맞는 인자를 보내는 경우: 루프가 죽지 않고 오류를 도구 결과로 돌려준 뒤 계속 진행한다. → Task 15 `unknown tool`, `invalid args`

---

## 파일 구조

```
src/lib/llm/
  tool-calling.ts            # 메시지·도구·도구호출 공용 타입 (신규)
  clients/openai-compatible.ts  # index.ts 에서 이동 + chatWithTools (신규)
  clients/chatgpt.ts         # Codex Responses 클라이언트 (신규)
  clients/fallback.ts        # 대체 제공자 래퍼 (신규)
  chatgpt/token-store.ts     # OAuth 토큰 파일·갱신·디바이스 로그인 (신규)
  chatgpt/constants.ts       # 엔드포인트·client id (Task 1 결과로 채움)
  chart-extract.ts           # analyzeResults 의 차트/마인드맵 추출을 분리 (신규)
  index.ts / config.ts / safe-sql.ts / schema-info.ts  # 수정
src/lib/chat-tools/
  types.ts  registry.ts  term-dictionary.ts  fuzzy.ts
  people.ts  wbs.ts  records.ts  readonly-sql.ts  proposals.ts
src/lib/chat-agent/
  context.ts  run-agent.ts  system-prompt.ts
src/lib/services/
  issueService.ts  fieldIssueService.ts  discussionItemService.ts  taskService.ts(수정)
src/lib/wbs/schedule-stats.ts
src/app/api/chat/route.ts (수정)
src/app/api/chat/actions/[id]/confirm/route.ts, cancel/route.ts
src/app/api/admin/chatgpt-auth/route.ts
src/app/dashboard/chat/components/ConfirmActionCard.tsx, CandidatePicker.tsx
src/app/dashboard/settings/components/ChatGptConnection.tsx
scripts/chatgpt-probe.ts, scripts/eval-chat.ts, scripts/eval-chat/{fixture.ts,questions.ts}
```

---

## Phase A: 안전장치 (바로 배포 가능)

### Task 1: ChatGPT Codex 연결 프로브 (사용자 실행)

**Files:**
- Create: `scripts/chatgpt-probe.ts`
- Create: `src/lib/llm/chatgpt/constants.ts`

**Interfaces:**
- Produces: `CHATGPT_API_BASE`, `CHATGPT_OAUTH_ISSUER`, `CHATGPT_CLIENT_ID`, `CHATGPT_DEFAULT_MODEL` 상수(문자열)

- [ ] **Step 1:** Codex CLI 오픈소스(`openai/codex`의 로그인 모듈)와 LiteLLM `chatgpt` 제공자 문서에서 디바이스 코드 엔드포인트, client id, Responses 요청 헤더(`chatgpt-account-id` 등)를 확인해 `constants.ts`에 적는다. 출처 URL을 주석으로 남긴다.
- [ ] **Step 2:** `scripts/chatgpt-probe.ts`를 쓴다. 디바이스 코드 로그인을 하고 토큰을 `--auth-file <경로>`(저장소 밖)에 저장한다. 그다음 세 가지를 호출해 결과를 출력한다. (a) 단순 질문, (b) `get_weather` 같은 더미 도구 1개를 준 도구 호출, (c) 도구 결과를 돌려준 뒤의 최종 답. 토큰 값은 출력하지 않는다.
- [ ] **Step 3:** 사용자에게 실행을 요청한다: `npx tsx scripts/chatgpt-probe.ts --auth-file D:\secrets\chatgpt-probe.json`. 판정 기준은 (b)에서 `function_call` 항목이 오고 (c)에서 텍스트 답이 오는 것이다. 사용 가능한 모델 이름도 기록한다.
- [ ] **Step 4:** 도구 호출이 안 되면 **중단하고 사용자와 재논의한다**(스펙 5.2). 되면 프로브가 실제 요청 본문(필수 필드, 예: `instructions`, `store`, `stream`)과 응답 원문(SSE 스트림인지 JSON인지 포함)을 토큰·계정 ID를 가린 채 `src/lib/llm/clients/__fixtures__/chatgpt-*.txt`에 저장하게 한다. Task 5의 `chatgpt.test.ts`는 이 원문 샘플로만 테스트한다(지어낸 응답 형식 금지). 확인한 형식은 `constants.ts` 주석과 스펙 5.2에도 적는다.

### Task 2: 자유 SQL을 DB 수준 읽기 전용으로

**Files:**
- Modify: `src/lib/llm/index.ts` (`validateSQL`), `src/lib/llm/safe-sql.ts` (`runSafeSql`), `src/app/api/chat/route.ts` (TASK INSERT 감지 블록 삭제)
- Test: `src/lib/llm/safe-sql.test.ts`, `src/lib/llm/validate-sql.test.ts`(신규)

**Interfaces:**
- Produces: `runSafeSql(prisma, sql): Promise<unknown[]>`. 시그니처는 그대로이고 READ ONLY 실행과 `statement_timeout = 10s`가 추가된다.
- 순서 제약(2026-11-09 로컬 PG18에서 확인): READ ONLY 트랜잭션에서는 TEMP VIEW의 `CREATE`/`DROP`도 거절된다. 그래서 **임시 뷰 생성 → `SET TRANSACTION READ ONLY` → `SET LOCAL statement_timeout = '10s'` → 쿼리** 순서로 실행하고, 끝은 `DROP` 대신 **롤백**으로 정리한다. 이 순서에서 SELECT는 OK, UPDATE와 DROP은 거절됨을 확인했다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `validate-sql.test.ts`: `validateSQL('INSERT INTO "tasks" ...').valid === false`, `validateSQL('UPDATE "issues" SET ...').valid === false`, `validateSQL('WITH x AS (UPDATE ...) SELECT 1').valid === false`, `validateSQL('SELECT 1').valid === true`, `validateSQL('WITH a AS (SELECT 1) SELECT * FROM a').valid === true`
  - `safe-sql.test.ts`에 `"view, then READ ONLY, then timeout, then query; no DROP"`을 추가한다. tx 목이 받은 호출 순서가 `CREATE OR REPLACE TEMP VIEW ...`, `SET TRANSACTION READ ONLY`, `SET LOCAL statement_timeout = '10s'`, `$queryRawUnsafe(sql)`이고, `DROP`을 포함한 호출이 없는지 검사한다. 그리고 `"returns rows although transaction rolls back"`(롤백 신호를 던져도 `runSafeSql`은 redact된 rows를 돌려줌)도 추가한다.
- [ ] **Step 2:** `npx vitest run src/lib/llm/validate-sql.test.ts src/lib/llm/safe-sql.test.ts`로 FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. `validateSQL`은 허용 문을 `SELECT`/`WITH`로 줄이고, `\b(INSERT|UPDATE|DELETE|MERGE)\b`가 있으면 거절한다. 허용 테이블 검사 블록은 삭제한다. `runSafeSql`은 위 순서로 실행한다. 쿼리 결과는 `class RollbackWithRows extends Error { rows }`에 담아 던져 트랜잭션을 롤백시키고, `$transaction` 바깥에서 잡아 rows를 돌려준다(다른 오류는 그대로 다시 던진다). `route.ts`의 `executeQuery`에서 TASK INSERT 분기와 `createTask` import를 지우고 `runSafeSql`만 호출하게 한다.
- [ ] **Step 4:** 테스트 PASS, `npx tsc --noEmit` 통과를 확인한다. 실제 PG 확인으로 `scripts/check-readonly-sql.ts`(1회용, 커밋하지 않음)를 쓴다. 로컬 DB에 `runSafeSql`로 `SELECT count(*) FROM users`(OK여야 함)와 `UPDATE issues SET title=title WHERE false`(read-only 오류여야 함)를 실행한다. 롤백되므로 데이터는 바뀌지 않는다.
- [ ] **Step 5: Commit** `fix: AI 채팅 SQL 을 읽기 전용 트랜잭션으로만 실행한다`

### Task 3: 채팅용 스키마 설명 정리

**Files:**
- Modify: `src/lib/llm/schema-info.ts`
- Test: `src/lib/llm/schema-info.test.ts`(신규)

**Interfaces:**
- Produces: `DATABASE_SCHEMA`에 남는 키 = `CHAT_SCHEMA_TABLES`(export). 값은 `users, projects, team_members, tasks, task_assignees, wbs_items, wbs_assignees, milestones, timeline_rows, issues, requirements, customer_requirements, field_issues, discussion_items, interviews, equipments, equipment_connections, weekly_reports, weekly_report_items, documents, as_is_overviews, as_is_overview_items`
- 참고: 진도/리스크(`progress_tasks`, `progress_risk_issues`)는 지금 `schema-info.ts`에 설명이 없어 이번에 넣지 않는다. 필요하면 조회 도구로 따로 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `"every table name exists in prisma @@map"`: `prisma/schema.prisma`를 `fs`로 읽고 `@@map\("([^"]+)"\)` 목록을 뽑아, `Object.values(DATABASE_SCHEMA).map(t => t.tableName)`의 모든 값이 그 목록에 있는지 검사한다.
  - `"keeps only chat tables"`: `Object.keys(DATABASE_SCHEMA).sort()`가 `[...CHAT_SCHEMA_TABLES].sort()`와 같은지 검사한다.
- [ ] **Step 2:** FAIL을 확인한다(`chat_history`가 실제 이름과 안 맞음).
- [ ] **Step 3:** 목록 밖의 테이블(베트남 잔재: process_verification_*, as_is 상세 13개, 설정·알림·채팅·slack·nudge·workload)을 삭제한다. 중복 정의된 블록(파일 후반부의 두 번째 목록)이 있으면 하나로 합친다. `index.ts`의 `selectRelevantTables` 예시와 필터에서 삭제한 테이블 이름도 지운다.
- [ ] **Step 4:** PASS와 tsc 통과를 확인한다.
- [ ] **Step 5: Commit** `refactor: 채팅 스키마 설명에서 쓰지 않는 테이블을 뺀다`

## Phase B: LLM 계층

### Task 4: ChatGPT 토큰 저장소

**Files:**
- Create: `src/lib/llm/chatgpt/token-store.ts`
- Test: `src/lib/llm/chatgpt/token-store.test.ts`

**Interfaces:**
- Consumes: Task 1 상수
- Produces:
  ```ts
  type ChatGptAuthStatus = { connected: boolean; accountEmail?: string; expiresAt?: string; error?: string };
  function getChatGptAuthStatus(): Promise<ChatGptAuthStatus>;
  function getValidAccessToken(): Promise<{ accessToken: string; accountId: string }>; // 만료 60초 전이면 갱신
  function startDeviceLogin(): Promise<{ verificationUri: string; userCode: string; deviceCode: string; intervalSec: number; expiresAt: string }>;
  function pollDeviceLogin(deviceCode: string): Promise<"pending" | "connected" | "expired" | "denied">;
  function clearChatGptAuth(): Promise<void>;
  class ChatGptAuthError extends Error { code: "NOT_CONNECTED" | "RELOGIN_REQUIRED" }
  ```
  파일 경로는 `process.env.CHATGPT_AUTH_FILE`이다. 미설정이면 `NOT_CONNECTED`.

- [ ] **Step 1: 실패하는 테스트 작성** (임시 디렉터리 + `fetch` 목)
  - `"returns stored token when not expired"`: 만료가 1시간 남은 파일이면 fetch를 호출하지 않는다.
  - `"refreshes and rewrites file when expired"`: 만료된 파일이면 refresh 요청이 1회 나가고, 파일의 refresh_token이 새 값으로 바뀐다.
  - `"single-flight refresh"`: `Promise.all([getValidAccessToken(), getValidAccessToken()])`에서 refresh fetch는 1회이고 두 결과의 토큰이 같다.
  - `"refresh 401 → RELOGIN_REQUIRED"`: refresh 응답이 401이면 `ChatGptAuthError`(code `RELOGIN_REQUIRED`)를 던지고 파일은 지우지 않는다.
  - `"never writes token to console"`: `console.log/error` 스파이에 토큰 문자열이 포함되지 않는다.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. 모듈 수준 `refreshPromise`로 single-flight를 만들고, 파일 쓰기는 `<file>.tmp`에 쓴 뒤 rename한다. 다른 프로세스와의 경합에 대비해 `<file>.lock`을 `fs.open(..., "wx")`로 잡고, 30초가 넘은 잠금은 오래된 것으로 보고 지운다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: ChatGPT 구독 OAuth 토큰 저장소를 추가한다`

### Task 5: 도구 호출 클라이언트 (OpenAI 호환 + ChatGPT + 대체)

**Files:**
- Create: `src/lib/llm/tool-calling.ts`, `src/lib/llm/clients/openai-compatible.ts`, `src/lib/llm/clients/chatgpt.ts`, `src/lib/llm/clients/fallback.ts`
- Modify: `src/lib/llm/index.ts`(클래스 이동, `createLLMClient` 분기), `src/lib/llm/config.ts`(`chatgpt` 제공자)
- Test: `src/lib/llm/clients/openai-compatible.test.ts`, `chatgpt.test.ts`, `fallback.test.ts`, `src/lib/llm/config.test.ts`(추가)

**Interfaces:**
- Produces (`tool-calling.ts`):
  ```ts
  type ChatMessage =
    | { role: "system" | "user"; content: string }
    | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
    | { role: "tool"; toolCallId: string; content: string };
  interface ToolDefinition { name: string; description: string; parameters: Record<string, unknown> /* JSON Schema */ }
  interface ToolCall { id: string; name: string; arguments: string /* JSON 문자열 */ }
  type ToolTurn = { type: "text"; content: string } | { type: "tool_calls"; calls: ToolCall[]; content?: string };
  ```
- Produces (`LLMClient` 추상 클래스에 추가): `supportsTools: boolean`(기본 false), `chatWithTools(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolTurn>`(기본 구현은 Error), `usedFallback?: boolean`(마지막 호출이 대체 경로였는지)
- Produces (`config.ts`): `LLM_PROVIDERS`에 `"chatgpt"` 추가. `resolveLLMConfig`는 `provider === "chatgpt"`이면 키 검사 없이 `{ provider: "chatgpt", apiKey: "", model: setting.chatgptModel ?? CHATGPT_DEFAULT_MODEL }`를 돌려준다. `AiSettingFields`에 `chatgptModel: string` 추가.
- Prisma: `AiSetting.chatgptModel String @default("<Task 1에서 확인한 모델>")`를 추가하고, `provider` 기본값을 `"chatgpt"`로 바꾼다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - openai-compatible: `"sends tools and parses tool_calls"`. 목 응답 `choices[0].message.tool_calls=[{id:"c1",function:{name:"list_issues",arguments:"{}"}}]` → `{type:"tool_calls",calls:[{id:"c1",name:"list_issues",arguments:"{}"}]}`. 요청 본문의 `tools[0].type==="function"`. `role:"tool"` 메시지는 `tool_call_id`로 직렬화한다.
  - chatgpt: `"maps messages to Responses input and parses function_call"`. 요청 URL이 `${CHATGPT_API_BASE}/responses`이고, `Authorization: Bearer <토큰>`이며, `input`이 배열이고, Task 1에서 확인한 필수 필드가 들어 있다. fetch 목은 `__fixtures__/chatgpt-*.txt` 원문(SSE면 스트림 그대로)을 돌려주고, 클라이언트는 그 안의 function_call을 `ToolCall`로, 텍스트를 `{type:"text"}`로 바꾼다. 토큰은 `getValidAccessToken` 목에서 받는다.
  - fallback: `"falls back on 429 / RELOGIN_REQUIRED / network error and sets usedFallback"`, `"no fallback configured → rethrows with 안내 메시지"`(메시지에 "ChatGPT 연결" 포함).
  - config: `resolveLLMConfig({provider:"chatgpt", ...})`가 ok:true를 돌려준다.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. `OpenAICompatibleClient`를 `clients/openai-compatible.ts`로 옮기고 `supportsTools=true`로 둔다. `ChatGptClient.generate()`는 `chatWithTools([...], [])`의 텍스트를 돌려준다. `createLLMClient`는 `chatgpt`이면 `new FallbackClient(new ChatGptClient(cfg), fallbackFromEnv())`로 만든다. `RateLimitRetryClient`는 `chatWithTools`와 `supportsTools`도 위임한다. `npx prisma generate`와 `db push`를 하고, 설정 화면 타입(`src/app/dashboard/settings/page.tsx`의 provider 목록)과 `src/app/api/ai-settings/route.ts`의 허용값에 `chatgpt`를 추가한다.
- [ ] **Step 4:** PASS를 확인하고 tsc와 기존 `config.test.ts`, `retry.test.ts` 통과를 확인한다.
- [ ] **Step 5: Commit** `feat: LLM 도구 호출과 ChatGPT 구독 제공자를 추가한다`

### Task 6: 관리자 ChatGPT 연결 화면

**Files:**
- Create: `src/app/api/admin/chatgpt-auth/route.ts`, `src/app/dashboard/settings/components/ChatGptConnection.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`(관리자일 때 컴포넌트 표시, provider 선택지에 "회사 ChatGPT")
- Test: `src/app/api/admin/chatgpt-auth/route.test.ts`

**Interfaces:**
- Consumes: Task 4 함수
- Produces: `GET` → `ChatGptAuthStatus`. `POST {action:"start"}` → `{verificationUri,userCode,deviceCode,intervalSec,expiresAt}`. `POST {action:"poll",deviceCode}` → `{state}`. `DELETE` → 연결 해제. 모두 ADMIN이 아니면 403이다.

- [ ] **Step 1: 실패하는 테스트 작성**: `"403 for non-admin"`(GET/POST/DELETE 각각), `"start returns code without tokens"`(응답 JSON에 `access`/`refresh` 문자열이 없음), `"poll passes through state"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 라우트와 컴포넌트를 구현한다. 컴포넌트는 상태(연결됨/끊김/재로그인 필요, 만료일), [연결] 버튼, 코드·URL 표시, `intervalSec`마다 poll, [연결 해제]로 구성한다. 다크모드 클래스와 기본 라이트 색을 함께 쓴다.
- [ ] **Step 4:** PASS를 확인한다. 화면은 Task 17에서 브라우저로 함께 확인한다.
- [ ] **Step 5: Commit** `feat: 관리자 화면에서 회사 ChatGPT 계정을 연결한다`

## Phase C: 도구

### Task 7: 도구 프레임워크와 용어 사전

**Files:**
- Create: `src/lib/chat-tools/types.ts`, `registry.ts`, `term-dictionary.ts`
- Test: `src/lib/chat-tools/term-dictionary.test.ts`, `registry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface ToolContext { projectId: string; user: AuthUser; prisma: typeof import("@/lib/prisma").prisma; llm?: LLMClient; promptConfig?: SystemPromptConfig }
  type ToolResult =
    | { kind: "data"; summary: string; rows?: Record<string, unknown>[]; chartHint?: "bar" | "line" | "pie" | "mindmap" }
    | { kind: "proposal"; actionId: string; summary: string; fields: { label: string; value: string }[] }
    | { kind: "candidates"; prompt: string; options: { label: string; value: string }[] }
    | { kind: "error"; message: string };
  interface ChatTool<A = unknown> { name: string; description: string; parameters: Record<string, unknown>; kind: "read" | "write"; parse(args: unknown): A /* 실패 시 Error */; execute(ctx: ToolContext, args: A): Promise<ToolResult> }
  function registerTool(t: ChatTool): void; function getTool(name: string): ChatTool | undefined; function toolDefinitions(): ToolDefinition[];
  const TERM_DICTIONARY: Record<"issueStatus"|"issuePriority"|"taskStatus"|"taskPriority"|"fieldIssueStatus"|"discussionStatus"|"discussionPriority"|"requirementStatus", Record<string /*Enum 값*/, string[] /*한국어 표현*/>>;
  function termGuide(): string; // 도구 description 에 붙일 "긴급 → CRITICAL, HIGH" 형식 안내
  ```
- 스펙에서 바뀐 점: 화면 라벨이 `constants.ts`가 아니라 각 페이지 안에 흩어져 있다(예: `issues/page.tsx`의 `CRITICAL: { label: "긴급" }`). 그래서 사전은 `term-dictionary.ts` 한 곳에 두고, 테스트로 Enum 전체를 덮는지 검사한다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `"covers every prisma enum value"`: `@prisma/client`의 `IssueStatus`, `IssuePriority`, `TaskStatus`, `TaskPriority`, `FieldIssueStatus`, `DiscussionStatus`, `DiscussionPriority`, `RequirementStatus`의 모든 값이 사전 키에 있다.
  - `"maps common Korean terms"`: `issuePriority.CRITICAL`에 "긴급"이 들어 있고, `issueStatus.OPEN`에 "열린"과 "미해결"이 들어 있다. `taskPriority.HIGH`에 "긴급"이 들어 있다(TaskPriority에는 CRITICAL이 없음).
  - registry: `"duplicate name throws"`, `"toolDefinitions returns registered tools"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: 채팅 도구 레지스트리와 한국어 용어 사전을 추가한다`

### Task 8: 사람 찾기 (퍼지 매칭)

**Files:**
- Create: `src/lib/chat-tools/fuzzy.ts`, `src/lib/chat-tools/people.ts`
- Test: `fuzzy.test.ts`, `people.test.ts`

**Interfaces:**
- Produces:
  ```ts
  function nameSimilarity(a: string, b: string): number; // 0~1, 한글은 자모 분해 후 편집 거리
  function matchPeople(query: string, people: { id: string; name: string }[]): { status: "unique" | "ambiguous" | "none"; matches: { id: string; name: string; score: number }[] };
  const findPeopleTool: ChatTool<{ query: string }>; // name "find_people"
  function resolvePerson(ctx: ToolContext, query: string): Promise<ReturnType<typeof matchPeople>>; // Task 13 이 사용
  ```
  `unique`의 조건은 최고 점수가 0.75 이상이고 2위와 0.1 넘게 차이 나는 것이다. 최고 점수가 0.75 이상인데 차이가 0.1 이하면 `ambiguous`, 0.75 미만이면 `none`이다. 조회 대상은 해당 프로젝트 `team_members`의 사용자로 한정한다. 입력의 "님", "씨", "맴버", "멤버" 접미사는 제거한다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `matchPeople("유혁스", [{id:"1",name:"유혁수"},{id:"2",name:"김재옥"}])` → `status:"unique"`, `matches[0].id==="1"`
  - `matchPeople("최종무맴버", [{id:"a",name:"최종무"},{id:"b",name:"강승훈"}])` → unique, `"a"`
  - `"ambiguous"`: `matchPeople("최종", [{id:"a",name:"최종무"},{id:"b",name:"최종우"}])` → `status:"ambiguous"`, 후보 2명
  - `matchPeople("홍길동", [{id:"1",name:"유혁수"}])` → `none`
  - people: `"queries only project team members"` (prisma 목의 `teamMember.findMany` where에 `projectId: ctx.projectId`가 들어감)
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. 자모 분해는 유니코드 계산(`(code-0xAC00)` → 초성 19 × 중성 21 × 종성 28)으로 한다. 점수는 `1 - levenshtein / max(len)`이고, 부분 포함(query가 이름의 접두사)이면 0.8을 하한으로 둔다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: 채팅 사람 찾기에 퍼지 매칭을 추가한다`

### Task 9: WBS 일정 통계 공용화와 WBS 도구

**Files:**
- Create: `src/lib/wbs/schedule-stats.ts`, `src/lib/chat-tools/wbs.ts`
- Modify: `src/app/api/wbs/schedule-stats/route.ts`(계산을 공용 함수 호출로 교체)
- Test: `src/lib/wbs/schedule-stats.test.ts`, `src/lib/chat-tools/wbs.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type WbsScheduleStats = /* 현재 route 가 NextResponse.json 으로 돌려주는 객체와 같은 모양 */;
  function computeScheduleStats(input: { project: {...}; holidays: Date[]; level1Items: Level1ItemWithChildren[]; today: Date }): WbsScheduleStats; // 순수 함수
  function loadWbsScheduleStats(projectId: string, today?: Date): Promise<WbsScheduleStats | null>; // prisma 조회 + compute
  const wbsScheduleStatsTool: ChatTool<Record<string, never>>; // "wbs_schedule_stats"
  const listWbsTool: ChatTool<{ level?: 1|2|3|4; status?: string[]; assigneeId?: string; delayedOnly?: boolean; keyword?: string; limit?: number }>; // "list_wbs"
  ```

- [ ] **Step 1: 실패하는 테스트 작성**
  - `"plan/actual/delay match hand-computed fixture"`: LEVEL1 2개(가중치 60/40), 말단 4개(기간, 진행률 지정)와 `today`를 고정한 입력에서 `plannedProgress`, `actualProgress`, `delayRate`가 손으로 계산한 값(소수 첫째 자리)과 같다. 기대값은 route의 현재 계산식(파일 상단 주석의 공식)으로 미리 계산해 테스트에 상수로 적는다.
  - `"route returns same shape"`: route GET이 `loadWbsScheduleStats` 결과를 그대로 JSON으로 돌려준다(목).
  - wbs 도구: `"list_wbs filters by project and delayedOnly"`(prisma where 검사), `"wbs_schedule_stats summary contains 계획/실적/지연율"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** route 본문의 계산을 그대로 옮긴다(로직 변경 금지). route는 인증·권한·`loadWbsScheduleStats` 호출만 남긴다.
- [ ] **Step 4:** PASS를 확인한다. 개발 서버가 떠 있으면 WBS 화면의 통계 바가 바뀌기 전과 같은 숫자인지 확인한다(서버는 사용자가 띄운 경우에만 확인한다).
- [ ] **Step 5: Commit** `refactor: WBS 일정 통계 계산을 공용 함수로 분리하고 채팅 도구로 노출한다`

### Task 10: 레코드 조회 도구

**Files:**
- Create: `src/lib/chat-tools/records.ts`
- Test: `src/lib/chat-tools/records.test.ts`

**Interfaces:**
- Produces: `list_tasks`, `list_issues`, `list_field_issues`, `list_customer_requirements`, `list_discussion_items`, `list_milestones`, `list_as_is_items`, `get_record` 도구(`ChatTool`). 목록 도구의 공통 인자는 `{ status?: string[]; priority?: string[]; assigneeId?: string; keyword?: string; dateFrom?: string; dateTo?: string; limit?: number /*기본 50, 최대 200*/ }`이다. `get_record`의 인자는 `{ code: string }`이고, 접두사로 테이블을 고른다. 판정 순서는 `ISS-`(issues) → `DIS-`(discussion_items) → `RQIT_`(customer_requirements) → `IS`+숫자(field_issues)다. `ISS-`가 `IS`보다 먼저여야 한다. 조회는 항상 `ctx.projectId` 안에서 한다. 같은 해석기를 `resolveRecordByCode(ctx, code): Promise<{ table: "issues"|"field_issues"|"discussion_items"|"customer_requirements"; id: string } | null>`로 export하고, Task 13이 쓴다. `summary`에는 건수와 앞 10건의 코드를 넣는다(Task 14 맥락 요약에 쓰임).

- [ ] **Step 1: 실패하는 테스트 작성**
  - `"always scopes by ctx.projectId"`: 각 도구 실행 시 prisma 목 `findMany`의 `where.projectId === ctx.projectId`(AS-IS는 `overview.projectId`).
  - `"rejects unknown enum value"`: `list_issues.parse({status:["URGENT"]})`가 throw하고, 메시지에 허용값 목록이 들어 있다.
  - `"keyword searches title and description insensitive"`
  - `"get_record resolves ISS-011 to issues"`, `"IS0001 resolves to field_issues"`, `"RQIT_00001 resolves to customer_requirements"`, `"code of another project returns null"`(where에 `projectId: ctx.projectId`)
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. description에 `termGuide()`를 붙인다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: 이슈·고객이슈·요구사항·협의요청·마일스톤·AS-IS 조회 도구를 추가한다`

### Task 11: 자유 SQL 도구

**Files:**
- Create: `src/lib/chat-tools/readonly-sql.ts`
- Test: `src/lib/chat-tools/readonly-sql.test.ts`

**Interfaces:**
- Consumes: `selectRelevantTables`, `generateSQL`, `validateSQL`(index.ts), `runSafeSql`(Task 2)
- Produces: `runReadonlySqlTool: ChatTool<{ question: string }>`(name `run_readonly_sql`). 내부에서 `ctx.llm`으로 테이블 선택과 SQL 생성을 하고(`ctx.promptConfig.sqlSystemPrompt` 사용), 실행한다. description에는 "다른 도구로 답할 수 없을 때만 사용"을 적는다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - `"rejects foreign project rows"`: 실행 결과 행에 `projectId`가 ctx와 다른 값이 있으면 `{kind:"error"}`를 돌려주고 rows를 포함하지 않는다.
  - `"returns validation error for non-select"`: 생성 SQL이 UPDATE이면 error.
  - `"passes sqlSystemPrompt to generateSQL"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: 읽기 전용 자유 SQL 채팅 도구를 추가한다`

## Phase D: 쓰기

### Task 12: 서비스 계층 추출 (이슈, 고객이슈, 협의요청, 태스크 수정)

**Files:**
- Create: `src/lib/services/issueService.ts`, `fieldIssueService.ts`, `discussionItemService.ts`
- Modify: `src/lib/services/taskService.ts`(`updateTask` 추가), `src/app/api/issues/route.ts`, `issues/[id]/route.ts`, `field-issues/route.ts`, `field-issues/[id]/route.ts`, `discussion-items/route.ts`, `discussion-items/[id]/route.ts`, `tasks/[id]/route.ts`
- Test: `src/lib/services/issueService.test.ts`, `fieldIssueService.test.ts`, `discussionItemService.test.ts`, `taskService.test.ts`

**Interfaces:**
- Produces(각 서비스 공통 형태):
  ```ts
  type ServiceResult<T> = { success: true; data: T } | { success: false; error: string; status: 400 | 403 | 404 };
  createIssue(input: CreateIssueInput, actor: AuthUser): Promise<ServiceResult<Issue>>;
  updateIssue(id: string, patch: UpdateIssueInput, actor: AuthUser): Promise<ServiceResult<Issue>>;
  createFieldIssue / updateFieldIssue, createDiscussionItem / updateDiscussionItem 동일 형태;
  updateTask(id: string, patch: UpdateTaskInput, actor: AuthUser): Promise<ServiceResult<Task>>;
  ```
  Input 타입은 각 route의 현재 body 필드에서 그대로 가져온다.

- [ ] **Step 1: 실패하는 테스트 작성** (prisma 목)
  - issue: `"next code ISS-013 after ISS-012"`, `"CRITICAL creates notifications for team members"`(현재 route 170~200행 동작)
  - fieldIssue: `"code IS0001 format"`, `"notifies assignee"`
  - discussion: `"code DIS-0001 format"`, `"notifies"`
  - 다른 프로젝트 대상 수정 거절(404): `"updateTask rejects other project task"`, `"updateIssue rejects other project issue"`, `"updateFieldIssue rejects other project"`, `"updateDiscussionItem rejects other project"`. 수정 서비스는 `id`와 함께 `projectId`를 받아 `findFirst({where:{id, projectId}})`로 확인한다.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** route 본문의 생성·수정 로직을 서비스로 옮긴다(동작 변경 금지). route는 인증, 권한, 파싱, 서비스 호출, 응답 변환만 남긴다.
- [ ] **Step 4:** PASS와 tsc 통과를 확인한다. 기존 `src/app/api/import-routes-order.test.ts`도 통과해야 한다.
- [ ] **Step 5: Commit** `refactor: 이슈·고객이슈·협의요청·태스크 쓰기 로직을 서비스 계층으로 옮긴다`

### Task 13: 쓰기 제안과 확인 API

**Files:**
- Modify: `prisma/schema.prisma`(모델 추가)
- Create: `src/lib/chat-tools/proposals.ts`, `src/app/api/chat/actions/[id]/confirm/route.ts`, `src/app/api/chat/actions/[id]/cancel/route.ts`
- Test: `src/lib/chat-tools/proposals.test.ts`, `src/app/api/chat/actions/[id]/confirm/route.test.ts`

**Interfaces:**
- Prisma:
  ```prisma
  model ChatPendingAction {
    id String @id @default(uuid())
    userId String; projectId String
    kind String      // "create_task" | "update_task" | "create_issue" | "update_issue" | "create_field_issue" | "update_field_issue" | "create_discussion_item" | "update_discussion_item"
    args Json        // 검증·정규화된 서비스 입력
    summary String
    status String @default("PENDING") // PENDING | CONFIRMED | CANCELLED | EXPIRED | FAILED
    resultRef String? // 생성/수정된 레코드 id
    error String?
    expiresAt DateTime
    createdAt DateTime @default(now())
    @@index([userId, status])
    @@map("chat_pending_actions")
  }
  ```
- Produces: 도구 `propose_create_task`, `propose_update_task`, `propose_create_issue`, `propose_update_issue`, `propose_create_field_issue`, `propose_update_field_issue`, `propose_create_discussion_item`, `propose_update_discussion_item`(kind `"write"`). 사람 인자는 이름 문자열(`assigneeName`)로 받아 `resolvePerson`으로 바꾼다. 수정 제안의 대상은 LLM이 준 id가 아니라 **코드**(`ISS-011`, `IS0003`, `DIS-0002`)로 받아 `resolveRecordByCode`(Task 10)로 `ctx.projectId` 안에서 찾는다. TASK는 코드가 없으므로 `list_tasks` 결과의 id를 받되, 서버가 `findFirst({where:{id, projectId: ctx.projectId}})`로 확인한다. 이를 위해 Task 10에 `list_tasks` 도구(공통 인자, `TaskStatus`/`TaskPriority` 사전)를 추가한다. 확인 API의 응답은 `{ status: "CONFIRMED", resultRef, link }`이다. link는 해당 화면 경로다(예: `/dashboard/issues?code=ISS-013`).

- [ ] **Step 1: 실패하는 테스트 작성**
  - proposals: `"returns candidates instead of proposal"`(resolvePerson이 ambiguous면 `{kind:"candidates"}`를 돌려주고 DB insert는 없음), `"creates pending action with 30min expiry"`(`expiresAt - now ≈ 30분`), `"does not call service on propose"`.
  - confirm route: `"executes service once"`, `"rejects double confirm"`(두 번째는 409이고 서비스는 1회만 호출됨. 상태 전이는 `updateMany where {id, status:"PENDING"}`의 count로 판정), `"rejects other user"`(403), `"rejects expired"`(410, 상태는 EXPIRED), `"checks project access"`, `"service failure marks FAILED"`, `"rejects target record of another project"`(proposal 단계에서 코드 해석이 null이면 `{kind:"error"}`, confirm 단계에서 서비스가 404면 FAILED이고 DB는 변경 없음).
  - cancel route: `"PENDING → CANCELLED"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. confirm·cancel 라우트는 `requireAuth()` 다음에 레코드를 읽어 소유자(`userId: user.id`)와 `assertProjectAccess(action.projectId, user)`를 본문에서 확인한다. `src/app/api/route-auth.test.ts`의 동적 경로 규칙(2026-11-09 d9 세션 추가)이 이를 검사한다. confirm은 먼저 `updateMany({where:{id,userId,status:"PENDING",expiresAt:{gt:now}}, data:{status:"CONFIRMED"}})`로 선점하고, count가 0이면 상태를 다시 읽어 409/410/403을 판정한 뒤 서비스를 호출한다. 서비스가 실패하면 FAILED와 error를 기록한다. `create_task`는 `createTask({... isAiGenerated: true, creatorId: user.id})`를 쓴다. `prisma generate`와 `db push`를 한다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: 채팅 쓰기 요청을 확인 후 실행하는 제안 흐름을 추가한다`

## Phase E: 에이전트와 화면

### Task 14: 대화 맥락

**Files:**
- Modify: `prisma/schema.prisma`(`ChatHistory.toolSummary Json?`, `ChatHistory.pendingActionId String?`)
- Create: `src/lib/chat-agent/context.ts`
- Test: `src/lib/chat-agent/context.test.ts`

**Interfaces:**
- Produces: `loadConversation(userId: string, projectId: string | null, turns = 6): Promise<ChatMessage[]>`. 이전 assistant 메시지에 `toolSummary`가 있으면 내용 앞에 `[이전 조회: <summary들>]`을 붙인다. 각 assistant 내용은 1,500자로 자른다.

- [ ] **Step 1: 실패하는 테스트 작성**: `"returns last 6 turns oldest first"`(12개 이상 저장된 목에서 12메시지 = 6턴), `"prepends tool summary"`, `"truncates long assistant content to 1500 chars"`, `"scopes by user and project"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현하고 `prisma generate`와 `db push`를 한다.
- [ ] **Step 4:** PASS를 확인한다.
- [ ] **Step 5: Commit** `feat: 채팅에 최근 대화 맥락을 넘긴다`

### Task 15: 에이전트 루프

**Files:**
- Create: `src/lib/chat-agent/run-agent.ts`, `src/lib/chat-agent/system-prompt.ts`, `src/lib/llm/chart-extract.ts`
- Modify: `src/lib/llm/index.ts`(`analyzeResults`가 `chart-extract`를 사용)
- Test: `src/lib/chat-agent/run-agent.test.ts`, `src/lib/llm/chart-extract.test.ts`

**Interfaces:**
- Produces:
  ```ts
  function buildSystemPrompt(opts: { projectName: string; today: string; analysisSystemPrompt?: string; personaSystemPrompt?: string }): string; // 안전 규칙 → 용어 안내 → 사용자 프롬프트 순
  function extractChartAndMindmap(content: string, rows: unknown[] | null, userMessage: string): Pick<LLMResponse, "content" | "chartType" | "chartData" | "mindmapData">; // analyzeResults 716~810행 로직 이동
  interface AgentResult extends LLMResponse { toolSummary: { tool: string; summary: string }[]; pendingAction?: { id: string; summary: string; fields: { label: string; value: string }[] }; candidates?: { prompt: string; options: { label: string; value: string }[] }; usedFallback: boolean }
  function runAgent(opts: { client: LLMClient; history: ChatMessage[]; userMessage: string; ctx: ToolContext; systemPrompt: string; maxSteps?: number /*6*/ }): Promise<AgentResult>;
  ```
  규칙은 다음과 같다. `proposal`이나 `candidates` 결과가 나오면 루프를 즉시 끝내고 그 결과로 응답한다. 마지막 data 결과의 rows는 `extractChartAndMindmap`에 넘긴다. maxSteps에 도달하면 "질문을 나눠서 다시 물어봐 주세요" 안내로 끝낸다.

- [ ] **Step 1: 실패하는 테스트 작성** (가짜 `LLMClient`가 정해진 `ToolTurn` 순서를 돌려줌)
  - `"chit-chat answers without tools"`: 첫 턴이 text면 도구 호출 0회.
  - `"runs read tool then answers"`: tool_calls(list_issues) → text. 도구 실행은 1회, `toolSummary` 길이는 1.
  - `"stops on proposal"`: propose 결과 뒤에 LLM을 다시 부르지 않고, `pendingAction`이 채워진다.
  - `"unknown tool"`: 없는 도구 이름이면 tool 메시지로 오류를 돌려주고 다음 턴을 계속 진행한다.
  - `"invalid args"`: parse가 throw하면 오류 메시지를 tool 결과로 넣고 계속 진행한다.
  - `"max steps"`: 계속 tool_calls만 오면 6스텝 뒤 안내 문구로 끝난다.
  - `"system prompt order"`: `buildSystemPrompt` 결과에서 안전 규칙의 위치가 personaSystemPrompt보다 앞에 있다.
  - chart-extract: 기존 `[CHART:bar]`와 `[MINDMAP_DATA:{...}]` 파싱 사례 2개(기존 동작 고정).
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. 시스템 프롬프트의 안전 규칙에는 다음 다섯 가지를 넣는다. "쓰기는 propose_* 도구로만 하고 사용자의 확인이 필요하다", "projectId를 묻거나 바꾸지 않는다", "다른 도구로 안 될 때만 run_readonly_sql을 쓴다", "모르는 사람 이름은 find_people로 확인한다", "숫자는 도구 결과에서만 인용한다".
- [ ] **Step 4:** PASS와 기존 테스트 통과를 확인한다.
- [ ] **Step 5: Commit** `feat: 도구를 골라 쓰는 채팅 에이전트 루프를 추가한다`

### Task 16: 채팅 API 연결

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Create: `src/lib/chat-tools/index.ts`(모든 도구 등록), `src/app/api/chat/route.test.ts`

**Interfaces:**
- Consumes: Task 5, 13, 14, 15
- Produces: POST 응답에 기존 필드와 함께 `pendingAction?`, `candidates?`, `usedFallback: boolean`을 추가한다. assistant `chat_histories`에는 `toolSummary`와 `pendingActionId`를 저장한다.

- [ ] **Step 1: 실패하는 테스트 작성**: `"uses agent when client.supportsTools"`, `"uses legacy pipeline otherwise"`, `"requires project access when projectId given"`(403), `"persists toolSummary"`, `"returns pendingAction"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. projectId가 없으면 도구 없이 답한다(프로젝트 선택 안내). `route.ts`가 300줄을 넘으면 POST 본문을 `src/lib/chat-agent/handle-chat.ts`로 뺀다.
- [ ] **Step 4:** PASS와 tsc 통과를 확인한다.
- [ ] **Step 5: Commit** `feat: 채팅 API 를 에이전트 구조로 전환한다`

### Task 17: 채팅 화면 (확인 카드, 후보 선택, 대체 표시)

**Files:**
- Create: `src/app/dashboard/chat/components/ConfirmActionCard.tsx`, `CandidatePicker.tsx`
- Modify: `src/app/dashboard/chat/components/ChatMessageItem.tsx`, `components/index.ts`(있으면 export), `src/app/dashboard/chat/page.tsx`(메시지 타입과 핸들러)
- Test: `ConfirmActionCard.test.tsx`, `CandidatePicker.test.tsx`

**Interfaces:**
- Consumes: Task 13 API, Task 16 응답 필드
- Produces: `ConfirmActionCard({ action, onDone })`. [등록]을 누르면 `POST /api/chat/actions/{id}/confirm`을 호출하고, 성공하면 결과 링크를 보여 주며, 실패하면 오류 문구와 함께 버튼을 비활성화한다. [취소]도 있다. `CandidatePicker({ candidates, onPick })`는 버튼을 누르면 `onPick(option.label)`을 호출하고, 페이지는 그 값을 다음 사용자 메시지로 보낸다.

- [ ] **Step 1: 실패하는 테스트 작성**: `"confirm calls API once and disables buttons"`(두 번 클릭해도 fetch는 1회), `"shows link after success"`, `"409 shows 이미 처리됨"`, `"picker sends label"`.
- [ ] **Step 2:** FAIL을 확인한다.
- [ ] **Step 3:** 구현한다. 대체 모델로 답한 메시지에는 "대체 모델로 답함" 작은 배지를 단다. 다크모드 클래스와 기본 라이트 색을 함께 쓴다. 배지·칩 색은 파스텔 단색 배경(`bg-{색}-50/100/200`) 대신 `bg-{색}-500/10 text-{색}-600 dark:text-{색}-400` 을 쓴다 (`docs/design/list-page-style.md` 7-1, `src/lib/design-rules/pastel-ratchet.test.ts` 가 검사).
- [ ] **Step 4:** PASS를 확인한다. 그다음 **사용자가 개발 서버를 띄운 경우** EGO Lite(`ego-browser`)로 `/dashboard/chat`에서 다음을 확인한다. ① "열린 이슈 보여줘" → "그중 긴급한 것만", ② "유혁스한테 테스트 태스크 등록해줘" → 확인 카드 → [취소], ③ 설정 화면의 ChatGPT 연결 상태. 개발 DB에서 [등록]을 누르는 확인은 사용자 동의를 받고 한다.
- [ ] **Step 5: Commit** `feat: 채팅 화면에 확인 카드와 후보 선택을 추가한다`

## Phase F: 평가

### Task 18: 평가 픽스처와 평가 스크립트 (사용자 실행)

**Files:**
- Create: `scripts/eval-chat/fixture.ts`, `scripts/eval-chat/questions.ts`, `scripts/eval-chat.ts`

**Interfaces:**
- Produces: `npx tsx scripts/eval-chat.ts --runs 3`. 대상 DB는 `EVAL_DATABASE_URL`(별도 데이터베이스 `wbsmaster_eval`)이다. 미설정이거나 `DATABASE_URL`과 같으면 즉시 종료한다. 픽스처는 실행할 때마다 지우고 다시 넣는다(스크립트 규칙: dotenv 로드, PrismaPg, 끝에 `$disconnect`와 `pool.end`).
- 질문 형식:
  ```ts
  interface EvalCase { id: string; type: "잡담"|"집계"|"관계"|"맥락"|"오타"|"용어"|"지표"|"쓰기"|"후보"; turns: string[]; expect: { tools?: string[]; noTools?: true; recordCodes?: string[]; count?: number; metric?: { key: string; value: number; tolerance: number }; proposalKind?: string; candidates?: true; dbUnchanged: true } }
  ```

- [ ] **Step 1:** 픽스처를 만든다. 오창 MES 가상 프로젝트 1개, 구성원 8명(최종무/최종우, 유혁수 포함), WBS 3레벨 30항목(가중치·기간·진행률), 이슈 12건, 고객이슈 8건, 협의요청 6건, TASK 6건, 마일스톤 5건을 넣는다. 지표 기대값은 `computeScheduleStats`로 계산해 넣는다.
- [ ] **Step 2:** 질문 30개를 적는다. 유형별 3~4개이고, 맥락은 2~3턴 연속 질문으로 만든다. 오늘 프로브에서 실패한 유형(잡담 → SQL, UNION 관계, "그중", 오타 3종, 보안 같은 넓은 표현)을 반드시 포함한다.
- [ ] **Step 3:** 스크립트를 쓴다. 각 케이스를 `--runs`번 돌린다. 판정은 실제로 호출된 도구, 반환된 레코드 코드, 건수, 지표 오차, 제안 kind, 그리고 실행 전후의 테이블별 `count(*)`와 `max(updatedAt)` 비교(DB 불변)로 한다. 판정 결과는 콘솔 표와 `docs/reports/2026-11-xx-chat-eval.md`로 남긴다.
- [ ] **Step 4:** 사용자에게 실행을 요청한다(실제 LLM 호출). 합격선은 전체 통과율 85% 이상이고, `dbUnchanged` 위반, 다른 프로젝트 레코드 노출, 지표 불일치가 각각 0건이어야 한다. 미달이면 실패 케이스를 분류해 Task 7~15의 사전, 설명, 프롬프트를 조정하고 다시 돌린다.
- [ ] **Step 5: Commit** `test: AI 채팅 평가 픽스처와 평가 스크립트를 추가한다`

---

## 배포 노트

- Prisma 변경(Task 5, 13, 14)은 운영 DB에 `prisma db push`가 필요하다. 배포 PR에 마이그레이션 노트로 적는다.
- 운영 서버(지성 IDC)에는 `CHATGPT_AUTH_FILE`(서비스 계정만 접근하는 저장소 밖 경로)과, 원하면 `CHAT_FALLBACK_*` 환경 변수를 설정한다. 그다음 관리자 화면에서 회사 계정으로 연결한다. 개발 PC의 토큰 파일을 복사하지 않는다.
- Phase A(Task 2, 3)는 다른 Task와 독립적이라 먼저 배포할 수 있다. 현재 쓰기 구멍을 막는 작업이다.
