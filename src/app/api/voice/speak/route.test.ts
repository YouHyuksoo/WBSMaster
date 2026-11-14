/**
 * @file src/app/api/voice/speak/route.test.ts
 * @vitest-environment node
 * @description 인증·잘못된 SDP·키 누락과 Realtime 연결 응답 계약을 검증합니다.
 * 초보자 가이드: DB와 OpenAI를 대체하므로 실제 설정이나 과금에 영향이 없습니다.
 */
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), setting: vi.fn(), call: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { aiSetting: { findUnique: mocks.setting } } }));
vi.mock("@/lib/openai-realtime", () => ({ createRealtimeSpeechCall: mocks.call }));
import { POST } from "./route";
const offer = "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n";
const post = (body: unknown) => POST(new Request("http://localhost/api/voice/speak", { method: "POST", body: JSON.stringify(body) }) as never);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "u1" }, error: null });
  mocks.setting.mockResolvedValue({ openaiApiKey: "test-key" });
  mocks.call.mockResolvedValue("v=0\r\nanswer");
});
it("미로그인은 연결 생성 전에 거부한다", async () => {
  mocks.auth.mockResolvedValue({ user: null, error: new Response(null, { status: 401 }) });
  expect((await post({ text: "안녕", sdp: offer })).status).toBe(401);
  expect(mocks.call).not.toHaveBeenCalled();
});
it.each([null, {}, { text: "안녕" }, { text: " ", sdp: offer }, { text: "안녕", sdp: "invalid" }, { text: "안녕", sdp: offer + "x".repeat(65536) }])("잘못된 입력은 외부 호출 없이 거부한다: %j", async (body) => {
  expect((await post(body)).status).toBe(400);
  expect(mocks.call).not.toHaveBeenCalled();
});
it("사용자 키가 없으면 안내한다", async () => {
  mocks.setting.mockResolvedValue(null);
  expect((await post({ text: "안녕", sdp: offer })).status).toBe(400);
  expect(mocks.call).not.toHaveBeenCalled();
});
it("정리한 답변과 서버 키로 연결하고 SDP 응답만 반환한다", async () => {
  const response = await post({ text: "**안녕**", sdp: offer });
  expect(response.headers.get("content-type")).toContain("application/sdp");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).toBe("v=0\r\nanswer");
  expect(mocks.call.mock.calls[0][1]).toMatchObject({ apiKey: "test-key", text: "안녕", sdp: offer });
});
it("연결 실패를 성공으로 반환하지 않는다", async () => {
  mocks.call.mockRejectedValue(new Error("Realtime 연결 실패"));
  expect((await post({ text: "안녕", sdp: offer })).status).toBe(502);
});
