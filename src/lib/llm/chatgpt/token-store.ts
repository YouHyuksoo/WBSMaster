/**
 * @file src/lib/llm/chatgpt/token-store.ts
 * @description
 * 회사 ChatGPT 구독 계정의 OAuth 토큰을 서버 파일(CHATGPT_AUTH_FILE)에 보관하고, 만료 전에 갱신하며,
 * 관리자 화면의 디바이스 코드 로그인을 처리합니다.
 *
 * 초보자 가이드:
 * - getValidAccessToken(): 채팅 호출 직전에 부른다. 만료 60초 전이면 refresh 후 파일을 다시 쓴다.
 * - refresh token 은 한 번 쓰면 바뀐다. 그래서 갱신은 프로세스 안에서 한 번만(single-flight),
 *   프로세스 사이에서는 <파일>.lock 으로 한 곳만 하게 한다.
 * - startDeviceLogin() → 화면에 URL·코드 표시 → pollDeviceLogin() 을 간격마다 호출.
 * - 토큰 값은 로그·응답에 절대 남기지 않는다. 파일은 저장소 밖, 서비스 계정만 읽게 둔다.
 */

import fs from "fs/promises";
import {
  CHATGPT_CLIENT_ID,
  CHATGPT_DEVICE_REDIRECT_URI,
  CHATGPT_DEVICE_TOKEN_URL,
  CHATGPT_DEVICE_USERCODE_URL,
  CHATGPT_DEVICE_VERIFICATION_URL,
  CHATGPT_TOKEN_URL,
} from "./constants";

export type ChatGptAuthStatus = { connected: boolean; accountEmail?: string; expiresAt?: string; error?: string };

export class ChatGptAuthError extends Error {
  constructor(public code: "NOT_CONNECTED" | "RELOGIN_REQUIRED", message: string) {
    super(message);
    this.name = "ChatGptAuthError";
  }
}

type Tokens = { id_token: string; access_token: string; refresh_token: string };
type AuthFile = { tokens: Tokens; last_refresh?: string };

const REFRESH_MARGIN_SEC = 60;
const LOCK_STALE_MS = 30_000;
const DEVICE_LOGIN_TTL_MS = 15 * 60_000;

function authFilePath(): string {
  const p = process.env.CHATGPT_AUTH_FILE;
  if (!p) throw new ChatGptAuthError("NOT_CONNECTED", "CHATGPT_AUTH_FILE 이 설정되지 않았습니다.");
  return p;
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function accountIdOf(idToken: string): string {
  const auth = decodeJwt(idToken)["https://api.openai.com/auth"] as { chatgpt_account_id?: string } | undefined;
  return auth?.chatgpt_account_id ?? "";
}

function expOf(accessToken: string): number {
  const exp = decodeJwt(accessToken).exp;
  return typeof exp === "number" ? exp : 0;
}

async function readAuth(): Promise<AuthFile | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(authFilePath(), "utf8")) as AuthFile;
    return parsed?.tokens?.access_token ? parsed : null;
  } catch (e) {
    if (e instanceof ChatGptAuthError) throw e;
    return null;
  }
}

async function writeAuth(data: AuthFile): Promise<void> {
  const p = authFilePath();
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, p);
}

/** 다른 프로세스와 동시 갱신을 막는 파일 잠금 */
async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const lock = `${authFilePath()}.lock`;
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      const h = await fs.open(lock, "wx");
      await h.close();
      break;
    } catch {
      const st = await fs.stat(lock).catch(() => null);
      if (st && Date.now() - st.mtimeMs > LOCK_STALE_MS) await fs.rm(lock, { force: true });
      else if (Date.now() > deadline) throw new Error("ChatGPT 토큰 잠금 대기 시간 초과");
      else await new Promise((r) => setTimeout(r, 200));
    }
  }
  try {
    return await fn();
  } finally {
    await fs.rm(lock, { force: true });
  }
}

async function refreshTokens(current: AuthFile): Promise<AuthFile> {
  return withFileLock(async () => {
    // 잠금을 기다리는 사이 다른 프로세스가 이미 갱신했을 수 있다
    const latest = (await readAuth()) ?? current;
    if (expOf(latest.tokens.access_token) - REFRESH_MARGIN_SEC > Date.now() / 1000) return latest;

    const res = await fetch(CHATGPT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CHATGPT_CLIENT_ID, grant_type: "refresh_token", refresh_token: latest.tokens.refresh_token }),
    });
    if (res.status === 400 || res.status === 401) {
      throw new ChatGptAuthError("RELOGIN_REQUIRED", "ChatGPT 연결이 만료되었습니다. 관리자가 다시 로그인해야 합니다.");
    }
    if (!res.ok) throw new Error(`ChatGPT 토큰 갱신 실패 (HTTP ${res.status})`);
    const body = (await res.json()) as Partial<Tokens>;
    const next: AuthFile = {
      tokens: {
        id_token: body.id_token ?? latest.tokens.id_token,
        access_token: body.access_token ?? latest.tokens.access_token,
        refresh_token: body.refresh_token ?? latest.tokens.refresh_token,
      },
      last_refresh: new Date().toISOString(),
    };
    await writeAuth(next);
    return next;
  });
}

let refreshing: Promise<AuthFile> | null = null;

/** 유효한 access token 과 계정 ID. 만료 임박이면 갱신한다. */
export async function getValidAccessToken(): Promise<{ accessToken: string; accountId: string }> {
  let auth = await readAuth();
  if (!auth) throw new ChatGptAuthError("NOT_CONNECTED", "회사 ChatGPT 계정이 연결되지 않았습니다.");
  if (expOf(auth.tokens.access_token) - REFRESH_MARGIN_SEC <= Date.now() / 1000) {
    if (!refreshing) refreshing = refreshTokens(auth).finally(() => (refreshing = null));
    auth = await refreshing;
  }
  return { accessToken: auth.tokens.access_token, accountId: accountIdOf(auth.tokens.id_token) };
}

/** 연결 상태 (토큰 값은 담지 않는다) */
export async function getChatGptAuthStatus(): Promise<ChatGptAuthStatus> {
  try {
    const auth = await readAuth();
    if (!auth) return { connected: false };
    const exp = expOf(auth.tokens.access_token);
    const email = decodeJwt(auth.tokens.id_token).email;
    return {
      connected: true,
      accountEmail: typeof email === "string" ? email : undefined,
      expiresAt: exp ? new Date(exp * 1000).toISOString() : undefined,
    };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 디바이스 코드 로그인 시작. deviceCode 는 이후 poll 에 그대로 넘긴다. */
export async function startDeviceLogin(): Promise<{
  verificationUri: string;
  userCode: string;
  deviceCode: string;
  intervalSec: number;
  expiresAt: string;
}> {
  const res = await fetch(CHATGPT_DEVICE_USERCODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CHATGPT_CLIENT_ID }),
  });
  if (!res.ok) throw new Error(`디바이스 코드 발급 실패 (HTTP ${res.status})`);
  const body = (await res.json()) as { device_auth_id: string; user_code?: string; usercode?: string; interval?: string | number };
  const userCode = body.user_code ?? body.usercode ?? "";
  const createdAt = Date.now();
  const deviceCode = Buffer.from(JSON.stringify({ d: body.device_auth_id, u: userCode, t: createdAt })).toString("base64url");
  return {
    verificationUri: CHATGPT_DEVICE_VERIFICATION_URL,
    userCode,
    deviceCode,
    intervalSec: Math.max(Number(body.interval) || 5, 3),
    expiresAt: new Date(createdAt + DEVICE_LOGIN_TTL_MS).toISOString(),
  };
}

/** 디바이스 코드 로그인 상태 확인. 승인되면 토큰을 교환해 파일에 저장한다. */
export async function pollDeviceLogin(deviceCode: string): Promise<"pending" | "connected" | "expired" | "denied"> {
  let parsed: { d: string; u: string; t: number };
  try {
    parsed = JSON.parse(Buffer.from(deviceCode, "base64url").toString("utf8"));
  } catch {
    return "denied";
  }
  if (Date.now() - parsed.t > DEVICE_LOGIN_TTL_MS) return "expired";

  const res = await fetch(CHATGPT_DEVICE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_auth_id: parsed.d, user_code: parsed.u }),
  });
  if (res.status === 403 || res.status === 404) return "pending";
  if (!res.ok) return "denied";
  const { authorization_code, code_verifier } = (await res.json()) as { authorization_code: string; code_verifier: string };

  const ex = await fetch(CHATGPT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorization_code,
      redirect_uri: CHATGPT_DEVICE_REDIRECT_URI,
      client_id: CHATGPT_CLIENT_ID,
      code_verifier,
    }).toString(),
  });
  if (!ex.ok) return "denied";
  const tokens = (await ex.json()) as Tokens;
  await writeAuth({ tokens, last_refresh: new Date().toISOString() });
  return "connected";
}

/** 연결 해제 (토큰 파일 삭제) */
export async function clearChatGptAuth(): Promise<void> {
  await fs.rm(authFilePath(), { force: true });
}
