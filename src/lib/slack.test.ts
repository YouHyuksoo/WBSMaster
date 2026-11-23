/**
 * @file src/lib/slack.test.ts
 * @description
 * Slack 웹훅 주소 확인(isSlackWebhookUrl)을 검사합니다.
 *
 * 초보자 가이드:
 * - 서버가 이 주소로 요청을 보내므로 https://hooks.slack.com/... 만 통과해야 한다.
 * - 비슷하게 생긴 다른 호스트 · 내부망 주소 · http 는 거절한다.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const { isSlackWebhookUrl } = await import("./slack");

describe("isSlackWebhookUrl", () => {
  it("Slack 수신 웹훅 주소만 통과한다", () => {
    expect(isSlackWebhookUrl("https://hooks.slack.com/services/T000/B000/xxxx")).toBe(true);
  });

  it.each([
    "http://hooks.slack.com/services/T000/B000/xxxx",
    "https://hooks.slack.com.evil.example/services/x",
    "https://evil.example/https://hooks.slack.com/",
    "https://hooks.slack.com@127.0.0.1/",
    "https://user:pw@hooks.slack.com/services/x",
    "https://hooks.slack.com:8443/services/x",
    "http://127.0.0.1:5432/",
    "http://169.254.169.254/latest/meta-data/",
    "file:///etc/passwd",
    "hooks.slack.com/services/x",
    "",
  ])("거절: %s", (url) => {
    expect(isSlackWebhookUrl(url)).toBe(false);
  });

  it("문자열이 아니면 거절한다", () => {
    for (const value of [undefined, null, 1, {}, ["https://hooks.slack.com/x"]]) expect(isSlackWebhookUrl(value)).toBe(false);
  });
});
