/**
 * @file src/lib/llm/chatgpt/constants.ts
 * @description
 * 회사 ChatGPT 구독 계정(OAuth)으로 Codex Responses API 를 부를 때 쓰는 고정 값입니다.
 * 비밀값이 아니라 Codex CLI 가 쓰는 공개 OAuth client 의 주소·ID 입니다.
 *
 * 초보자 가이드:
 * - 출처: openai/codex 저장소 codex-rs/login/src (2026-11-09 확인)
 *   - auth/manager.rs: CLIENT_ID, REFRESH_TOKEN_URL (JSON 본문으로 refresh)
 *   - device_code_auth.rs: {issuer}/api/accounts/deviceauth/usercode · /deviceauth/token,
 *     검증 화면 {issuer}/codex/device, 코드 교환 redirect_uri {issuer}/deviceauth/callback
 *   - server.rs: DEFAULT_ISSUER, {issuer}/oauth/token (authorization_code, form 인코딩)
 *   - http-client/src/openai_headers.rs: chatgpt-account-id 헤더
 * - Responses 호출 형식 (2026-11-09 scripts/chatgpt-probe.ts 로 회사 계정에서 확인, 원문 clients/__fixtures__/chatgpt-*.txt):
 *   POST {CHATGPT_API_BASE}/responses, 헤더 Authorization: Bearer + chatgpt-account-id
 *   본문 { model, instructions, input: [...], tools: [{type:"function", name, description, parameters}],
 *          tool_choice:"auto", parallel_tool_calls:false, store:false, stream:true }
 *   응답은 SSE(event:/data:) 스트림. response.completed 이벤트의 response.output 에 message·function_call 항목이 온다.
 *   도구 결과는 input 에 {type:"function_call", call_id, name, arguments} + {type:"function_call_output", call_id, output} 로 돌려준다.
 * - gpt-5.5 는 "not supported when using Codex with a ChatGPT account" 400. gpt-6.1-sol 은 텍스트·도구 호출 모두 확인.
 */

/** OAuth 발급자 */
export const CHATGPT_OAUTH_ISSUER = "https://auth.openai.com";

/** Codex CLI 공개 OAuth client id */
export const CHATGPT_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

/** 토큰 교환·갱신 엔드포인트 */
export const CHATGPT_TOKEN_URL = `${CHATGPT_OAUTH_ISSUER}/oauth/token`;

/** 디바이스 코드 발급 · 폴링 엔드포인트 */
export const CHATGPT_DEVICE_USERCODE_URL = `${CHATGPT_OAUTH_ISSUER}/api/accounts/deviceauth/usercode`;
export const CHATGPT_DEVICE_TOKEN_URL = `${CHATGPT_OAUTH_ISSUER}/api/accounts/deviceauth/token`;

/** 사용자가 코드를 입력하는 화면 */
export const CHATGPT_DEVICE_VERIFICATION_URL = `${CHATGPT_OAUTH_ISSUER}/codex/device`;

/** 디바이스 코드 교환 시 redirect_uri */
export const CHATGPT_DEVICE_REDIRECT_URI = `${CHATGPT_OAUTH_ISSUER}/deviceauth/callback`;

/** Codex Responses API 기본 주소 */
export const CHATGPT_API_BASE = "https://chatgpt.com/backend-api/codex";

/** 계정 식별 헤더 이름 (id_token 의 https://api.openai.com/auth.chatgpt_account_id 값) */
export const CHATGPT_ACCOUNT_ID_HEADER = "chatgpt-account-id";

/** 기본 모델 (2026-11-09 회사 계정에서 확인) */
export const CHATGPT_DEFAULT_MODEL = "gpt-6.1-sol";
