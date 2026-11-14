/**
 * @file src/lib/openai-realtime.test.ts
 * @description Realtime WebRTC의 서버 설정과 오류 노출을 실제 API 없이 검증합니다.
 * 초보자 가이드: fetch를 대체하여 유료 요청과 키 노출을 방지합니다.
 */
import { expect, it, vi } from "vitest";
import { createRealtimeSpeechCall, REALTIME_MODEL, REALTIME_VOICE } from "@/lib/openai-realtime";

it("Realtime calls로 SDP와 수신 전용 낭독 설정을 보내고 SDP만 반환한다", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("v=0\r\nanswer", { status: 201 }));
  const controller = new AbortController();
  expect(await createRealtimeSpeechCall(fetcher, { apiKey: "test-key", sdp: "offer", text: "**안녕**", signal: controller.signal })).toBe("v=0\r\nanswer");
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/realtime/calls");
  expect(init.signal).toBe(controller.signal);
  expect(init.headers).toEqual({ Authorization: "Bearer test-key" });
  expect(init.body.get("sdp")).toBe("offer");
  const session = JSON.parse(init.body.get("session"));
  expect(session).toMatchObject({ type: "realtime", model: REALTIME_MODEL, output_modalities: ["audio"], audio: { input: { turn_detection: null }, output: { voice: REALTIME_VOICE } } });
  expect(session.instructions).toContain("<원문>\n안녕\n</원문>");
  expect(session).not.toHaveProperty("response_format");
});

it.each([401, 403, 429, 500])("상위 오류 %i의 민감한 본문을 노출하지 않는다", async (status) => {
  const fetcher = vi.fn().mockResolvedValue(new Response("sensitive-upstream-body", { status }));
  await expect(createRealtimeSpeechCall(fetcher, { apiKey: "test-key", sdp: "offer", text: "a" })).rejects.not.toThrow("sensitive-upstream-body");
});
