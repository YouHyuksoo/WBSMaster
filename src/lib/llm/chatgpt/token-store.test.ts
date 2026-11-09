/**
 * @file src/lib/llm/chatgpt/token-store.test.ts
 * @description
 * 회사 ChatGPT 계정 OAuth 토큰 저장소(파일·갱신·디바이스 로그인) 테스트입니다. 실제 OpenAI 를 부르지 않고 fetch 를 목으로 바꿉니다.
 *
 * 초보자 가이드:
 * - refresh token 은 한 번 쓰면 바뀌므로 갱신은 동시에 한 번만 나가야 한다 (single-flight).
 * - 토큰 문자열은 콘솔에 찍히면 안 된다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

/** 서명 없는 테스트용 JWT */
function jwt(payload: Record<string, unknown>): string {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "none" })}.${b(payload)}.sig`;
}
const ID_TOKEN = jwt({ email: "pm@jisheng.co.kr", "https://api.openai.com/auth": { chatgpt_account_id: "acc-1" } });
const nowSec = () => Math.floor(Date.now() / 1000);

let dir: string;
let file: string;

function writeAuth(accessExpSec: number, refresh = "refresh-old") {
  fs.writeFileSync(
    file,
    JSON.stringify({ tokens: { id_token: ID_TOKEN, access_token: jwt({ exp: accessExpSec, tag: "old" }), refresh_token: refresh } })
  );
}

async function load() {
  vi.resetModules();
  return import("./token-store");
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-auth-"));
  file = path.join(dir, "auth.json");
  process.env.CHATGPT_AUTH_FILE = file;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.CHATGPT_AUTH_FILE;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("getValidAccessToken", () => {
  it("returns stored token when not expired", async () => {
    writeAuth(nowSec() + 3600);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getValidAccessToken } = await load();
    const t = await getValidAccessToken();
    expect(t.accountId).toBe("acc-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes and rewrites file when expired", async () => {
    writeAuth(nowSec() - 10);
    const newAccess = jwt({ exp: nowSec() + 3600, tag: "new" });
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: newAccess, refresh_token: "refresh-new", id_token: ID_TOKEN }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getValidAccessToken } = await load();
    const t = await getValidAccessToken();
    expect(t.accessToken).toBe(newAccess);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ grant_type: "refresh_token", refresh_token: "refresh-old" });
    expect(JSON.parse(fs.readFileSync(file, "utf8")).tokens.refresh_token).toBe("refresh-new");
  });

  it("single-flight refresh", async () => {
    writeAuth(nowSec() - 10);
    const newAccess = jwt({ exp: nowSec() + 3600, tag: "new" });
    const fetchMock = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ access_token: newAccess, refresh_token: "refresh-new" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getValidAccessToken } = await load();
    const [a, b] = await Promise.all([getValidAccessToken(), getValidAccessToken()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.accessToken).toBe(b.accessToken);
  });

  it("refresh 401 → RELOGIN_REQUIRED and keeps file", async () => {
    writeAuth(nowSec() - 10);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("invalid_grant", { status: 401 })));
    const { getValidAccessToken, ChatGptAuthError } = await load();
    const err = await getValidAccessToken().catch((e) => e);
    expect(err).toBeInstanceOf(ChatGptAuthError);
    expect(err.code).toBe("RELOGIN_REQUIRED");
    expect(fs.existsSync(file)).toBe(true);
  });

  it("missing file → NOT_CONNECTED", async () => {
    const { getValidAccessToken } = await load();
    const err = await getValidAccessToken().catch((e) => e);
    expect(err.code).toBe("NOT_CONNECTED");
  });

  it("never writes token to console", async () => {
    writeAuth(nowSec() - 10);
    const newAccess = jwt({ exp: nowSec() + 3600, tag: "new" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: newAccess, refresh_token: "refresh-new" }), { status: 200 })));
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "info")];
    const { getValidAccessToken } = await load();
    await getValidAccessToken();
    const printed = spies.flatMap((s) => s.mock.calls.flat()).map(String).join("\n");
    expect(printed).not.toContain(newAccess);
    expect(printed).not.toContain("refresh-new");
    expect(printed).not.toContain("refresh-old");
  });
});

describe("status and device login", () => {
  it("status shows email and expiry without tokens", async () => {
    writeAuth(nowSec() + 3600);
    const { getChatGptAuthStatus } = await load();
    const s = await getChatGptAuthStatus();
    expect(s.connected).toBe(true);
    expect(s.accountEmail).toBe("pm@jisheng.co.kr");
    expect(JSON.stringify(s)).not.toContain("refresh-old");
  });

  it("device login: start → pending → connected saves tokens", async () => {
    const calls: string[] = [];
    let pollCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/deviceauth/usercode")) return new Response(JSON.stringify({ device_auth_id: "d1", user_code: "ABCD-1234", interval: "5" }));
      if (url.endsWith("/deviceauth/token")) {
        pollCount++;
        return pollCount === 1
          ? new Response("pending", { status: 403 })
          : new Response(JSON.stringify({ authorization_code: "code1", code_verifier: "ver1", code_challenge: "ch" }));
      }
      if (url.endsWith("/oauth/token")) {
        return new Response(JSON.stringify({ id_token: ID_TOKEN, access_token: jwt({ exp: nowSec() + 3600 }), refresh_token: "r1" }));
      }
      return new Response("?", { status: 500 });
    }));
    const { startDeviceLogin, pollDeviceLogin } = await load();
    const start = await startDeviceLogin();
    expect(start.userCode).toBe("ABCD-1234");
    expect(start.verificationUri).toContain("/codex/device");
    expect(start.intervalSec).toBe(5);
    expect(await pollDeviceLogin(start.deviceCode)).toBe("pending");
    expect(await pollDeviceLogin(start.deviceCode)).toBe("connected");
    expect(JSON.parse(fs.readFileSync(file, "utf8")).tokens.refresh_token).toBe("r1");
  });

  it("clearChatGptAuth removes file", async () => {
    writeAuth(nowSec() + 3600);
    const { clearChatGptAuth, getChatGptAuthStatus } = await load();
    await clearChatGptAuth();
    expect((await getChatGptAuthStatus()).connected).toBe(false);
  });
});
