/**
 * @file scripts/chatgpt-probe.ts
 * @description
 * 회사 ChatGPT 구독 계정으로 Codex Responses API 가 (a) 텍스트 답, (b) 도구 호출, (c) 도구 결과 후 답을
 * 지원하는지 확인하는 1회용 프로브입니다. 실제 OpenAI 서버를 호출하므로 사용자가 직접 실행합니다.
 *
 * 초보자 가이드:
 * - 실행: npx tsx scripts/chatgpt-probe.ts --auth-file D:\secrets\chatgpt-probe.json [--model gpt-5.5]
 * - 토큰 파일이 없으면 디바이스 코드 로그인을 먼저 합니다 (화면에 URL·코드 표시).
 * - 토큰·계정 ID 는 출력하지 않고, 응답 원문은 계정 ID 를 가려
 *   src/lib/llm/clients/__fixtures__/chatgpt-{a,b,c}.txt 로 저장합니다 (단위 테스트용).
 * - 런타임 앱 코드에서 import 하지 않습니다.
 */
import fs from "node:fs";
import path from "node:path";
import * as C from "../src/lib/llm/chatgpt/constants";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const authFile = arg("auth-file");
const model = arg("model") ?? C.CHATGPT_DEFAULT_MODEL;
if (!authFile) throw new Error("--auth-file <저장소 밖 경로> 가 필요합니다");
// Git Bash 에서 역슬래시가 사라진 경로(예: D:secretsfile.json)를 미리 잡는다 → 슬래시(/)로 입력
if (/^[A-Za-z]:[^\\/]/.test(authFile)) throw new Error(`경로가 깨졌습니다: ${authFile}. 슬래시(/)로 입력하세요 (예: C:/Users/hsyou/.secrets/chatgpt-probe.json)`);
const FIXTURE_DIR = path.resolve(__dirname, "../src/lib/llm/clients/__fixtures__");

type Tokens = { id_token: string; access_token: string; refresh_token: string };

function accountIdOf(idToken: string): string {
  const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
  return payload["https://api.openai.com/auth"]?.chatgpt_account_id ?? "";
}

async function deviceLogin(): Promise<Tokens> {
  const uc = await fetch(C.CHATGPT_DEVICE_USERCODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: C.CHATGPT_CLIENT_ID }),
  });
  if (!uc.ok) throw new Error(`usercode 실패 ${uc.status}: ${await uc.text()}`);
  const { device_auth_id, user_code, usercode, interval } = await uc.json();
  const code = user_code ?? usercode;
  console.log(`\n1) 브라우저에서 ${C.CHATGPT_DEVICE_VERIFICATION_URL} 열기\n2) 코드 입력: ${code}\n`);
  const waitMs = Math.max(Number(interval) || 5, 3) * 1000;
  for (let t = Date.now(); Date.now() - t < 15 * 60_000; ) {
    await new Promise((r) => setTimeout(r, waitMs));
    const res = await fetch(C.CHATGPT_DEVICE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_auth_id, user_code: code }),
    });
    if (res.status === 403 || res.status === 404) continue;
    if (!res.ok) throw new Error(`deviceauth/token 실패 ${res.status}`);
    const { authorization_code, code_verifier } = await res.json();
    const ex = await fetch(C.CHATGPT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authorization_code,
        redirect_uri: C.CHATGPT_DEVICE_REDIRECT_URI,
        client_id: C.CHATGPT_CLIENT_ID,
        code_verifier,
      }),
    });
    if (!ex.ok) throw new Error(`코드 교환 실패 ${ex.status}`);
    return (await ex.json()) as Tokens;
  }
  throw new Error("디바이스 로그인 15분 초과");
}

async function callResponses(label: string, body: Record<string, unknown>, tokens: Tokens) {
  const accountId = accountIdOf(tokens.id_token);
  const res = await fetch(`${C.CHATGPT_API_BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${tokens.access_token}`,
      [C.CHATGPT_ACCOUNT_ID_HEADER]: accountId,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  const redacted = accountId ? raw.split(accountId).join("<ACCOUNT_ID>") : raw;
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(FIXTURE_DIR, `chatgpt-${label}.txt`),
    `# status ${res.status} content-type ${res.headers.get("content-type")}\n# request ${JSON.stringify(body)}\n${redacted}`,
    "utf8"
  );
  console.log(`[${label}] status=${res.status} content-type=${res.headers.get("content-type")} bytes=${raw.length}`);
  // SSE 의 response.completed 이벤트에서 output 을 꺼낸다 (JSON 이면 그대로)
  let output: Array<Record<string, unknown>> = [];
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const ev = JSON.parse(line.slice(5).trim());
      if (ev.type === "response.completed") output = ev.response?.output ?? [];
    } catch { /* 무시 */ }
  }
  if (!output.length && raw.trim().startsWith("{")) output = JSON.parse(raw).output ?? [];
  if (!res.ok) console.log(`  오류 본문(앞 300자): ${redacted.slice(0, 300)}`);
  return output;
}

const userMsg = (text: string) => ({ type: "message", role: "user", content: [{ type: "input_text", text }] });
const weatherTool = {
  type: "function",
  name: "get_weather",
  description: "도시의 현재 날씨를 조회한다",
  parameters: { type: "object", properties: { city: { type: "string" } }, required: ["city"], additionalProperties: false },
};

async function main() {
  let tokens: Tokens;
  if (fs.existsSync(authFile!)) tokens = JSON.parse(fs.readFileSync(authFile!, "utf8")).tokens;
  else {
    tokens = await deviceLogin();
    fs.mkdirSync(path.dirname(authFile!), { recursive: true });
    fs.writeFileSync(authFile!, JSON.stringify({ tokens, last_refresh: new Date().toISOString() }), { encoding: "utf8", mode: 0o600 });
    console.log("로그인 완료, 토큰 파일 저장");
  }
  const base = { model, instructions: "한국어로 짧게 답한다.", store: false, stream: true };

  const a = await callResponses("a", { ...base, input: [userMsg("1+1은?")] }, tokens);
  console.log("  (a) 텍스트:", JSON.stringify(a.filter((o) => o.type === "message")).slice(0, 200));

  const bInput = [userMsg("서울 날씨 알려줘")];
  const b = await callResponses("b", { ...base, input: bInput, tools: [weatherTool], tool_choice: "auto", parallel_tool_calls: false }, tokens);
  const call = b.find((o) => o.type === "function_call");
  console.log("  (b) function_call:", call ? `${call.name} ${call.arguments}` : "없음 ← 도구 호출 미지원이면 재논의");
  if (!call) return;

  const c = await callResponses("c", {
    ...base,
    tools: [weatherTool],
    // store:false 이므로 서버 저장 item id 를 참조하지 않게 id 를 빼고 돌려준다
    input: [...bInput, { type: "function_call", call_id: call.call_id, name: call.name, arguments: call.arguments }, { type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ city: "서울", temp: 12, sky: "맑음" }) }],
  }, tokens);
  console.log("  (c) 최종 답:", JSON.stringify(c.filter((o) => o.type === "message")).slice(0, 200));
  console.log(`\n모델 ${model} 확인 완료. 원문은 ${FIXTURE_DIR} 에 저장됨.`);
}

main().catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exit(1); });
