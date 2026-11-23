/**
 * @file src/app/api/slack-settings/route.test.ts
 * @description
 * Slack 설정 조회 · 저장 · 테스트 전송이 ADMIN 전용인지, 테스트 전송이 Slack 주소로만 나가는지 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 로그인만 하면 웹훅 주소를 보고 바꿀 수 있었고, 테스트 라우트는 아무 주소로나 서버 요청을 보냈다.
 * - USER 는 세 라우트 모두 403 이고 DB · 네트워크를 건드리지 않는다.
 * - ADMIN 이어도 Slack 주소가 아니면 400 이고 요청을 보내지 않는다.
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAuth }));
const slackSettings = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() };
vi.mock("@/lib/prisma", () => ({ prisma: { slackSettings } }));

const settingsRoute = await import("./route");
const testRoute = await import("./test/route");

const as = (role: string) => requireAuth.mockResolvedValue({ user: { id: "u", email: "u@example.invalid", role }, error: null });
const post = (url: string, body: unknown) => new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
const SLACK = "https://hooks.slack.com/services/T000/B000/xxxx";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  slackSettings.findFirst.mockResolvedValue({ id: "s1", webhookUrl: SLACK });
  fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("Slack 설정은 ADMIN 전용", () => {
  it.each(["USER", "GUEST"])("%s 는 조회 · 저장 · 테스트 전송 모두 403", async (role) => {
    as(role);
    const responses = [
      await settingsRoute.GET(new NextRequest("http://localhost/api/slack-settings")),
      await settingsRoute.POST(post("http://localhost/api/slack-settings", { webhookUrl: SLACK })),
      await testRoute.POST(post("http://localhost/api/slack-settings/test", { webhookUrl: SLACK })),
    ];
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403]);
    for (const r of responses) expect(JSON.stringify(await r.json())).not.toContain("hooks.slack.com");
    expect(slackSettings.findFirst).not.toHaveBeenCalled();
    expect(slackSettings.update).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ADMIN 은 조회할 수 있다", async () => {
    as("ADMIN");
    const res = await settingsRoute.GET(new NextRequest("http://localhost/api/slack-settings"));
    expect(res.status).toBe(200);
    expect((await res.json()).webhookUrl).toBe(SLACK);
  });
});

describe("웹훅 주소는 Slack 만", () => {
  it.each(["http://127.0.0.1:5432/", "http://169.254.169.254/latest/meta-data/", "https://hooks.slack.com.evil.example/x"])(
    "ADMIN 이어도 %s 로는 저장 · 테스트 전송하지 않는다",
    async (url) => {
      as("ADMIN");
      expect((await testRoute.POST(post("http://localhost/api/slack-settings/test", { webhookUrl: url }))).status).toBe(400);
      expect((await settingsRoute.POST(post("http://localhost/api/slack-settings", { webhookUrl: url }))).status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(slackSettings.update).not.toHaveBeenCalled();
      expect(slackSettings.create).not.toHaveBeenCalled();
    }
  );

  it("Slack 주소면 그 주소로 한 번 보내고, 다른 주소로 넘기는 응답은 따라가지 않는다", async () => {
    as("ADMIN");
    const res = await testRoute.POST(post("http://localhost/api/slack-settings/test", { webhookUrl: SLACK }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(SLACK);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", redirect: "error" });
  });
});
