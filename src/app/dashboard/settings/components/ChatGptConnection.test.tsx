/**
 * @file src/app/dashboard/settings/components/ChatGptConnection.test.tsx
 * @description
 * 관리자용 회사 ChatGPT 연결 패널 테스트입니다. fetch 는 목입니다.
 *
 * 초보자 가이드:
 * - 상태 표시(연결됨·계정·만료일), [연결] → 코드·URL 표시 → 승인되면 연결됨, [연결 해제]
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatGptConnection } from "./ChatGptConnection";

function mockApi(handlers: { status: unknown; start?: unknown; poll?: string[] }) {
  const polls = [...(handlers.poll ?? [])];
  const f = vi.fn(async (_url: string, init?: RequestInit) => {
    if (!init || init.method === undefined || init.method === "GET") return new Response(JSON.stringify(handlers.status));
    if (init.method === "DELETE") return new Response(JSON.stringify({ success: true }));
    const body = JSON.parse(String(init.body));
    if (body.action === "start") return new Response(JSON.stringify(handlers.start));
    return new Response(JSON.stringify({ state: polls.shift() ?? "pending" }));
  });
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ChatGptConnection", () => {
  it("shows connected account", async () => {
    mockApi({ status: { connected: true, accountEmail: "pm@jisheng.co.kr", expiresAt: "2026-11-19T00:00:00.000Z" } });
    render(<ChatGptConnection />);
    expect(await screen.findByText(/pm@jisheng.co.kr/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /연결 해제/ })).toBeTruthy();
  });

  it("start shows code and becomes connected after poll", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const f = mockApi({
      status: { connected: false },
      start: { verificationUri: "https://auth.openai.com/codex/device", userCode: "ABCD-1234", deviceCode: "dc", intervalSec: 1, expiresAt: "x" },
      poll: ["pending", "connected"],
    });
    render(<ChatGptConnection />);
    fireEvent.click(await screen.findByRole("button", { name: /^연결$/ }));
    expect(await screen.findByText("ABCD-1234")).toBeTruthy();
    expect(screen.getByRole("link", { name: /auth.openai.com\/codex\/device/ })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    await waitFor(() => expect(f.mock.calls.filter((c) => String((c[1] as RequestInit | undefined)?.body ?? "").includes("poll")).length).toBeGreaterThanOrEqual(2));
    // 연결 후 상태를 다시 읽는다
    await waitFor(() => expect(f.mock.calls.filter((c) => !(c[1] as RequestInit | undefined)?.method).length).toBeGreaterThanOrEqual(2));
  });
});
