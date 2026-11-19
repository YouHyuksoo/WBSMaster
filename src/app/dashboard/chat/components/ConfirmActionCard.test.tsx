/**
 * @file src/app/dashboard/chat/components/ConfirmActionCard.test.tsx
 * @description
 * AI 채팅 쓰기 확인 카드·후보 선택 테스트입니다. fetch 는 목입니다.
 *
 * 초보자 가이드:
 * - [등록] 은 한 번만 호출되고 버튼이 잠긴다. 성공하면 결과 링크, 409 면 "이미 처리됨".
 * - 후보 버튼을 누르면 그 이름을 다음 메시지로 보낸다.
 * - 등록이 끝나면 다른 화면의 캐시가 새로 고쳐진다 (회귀: AI 로 일정 등록 후 달력에 새로고침 전까지 안 보였다).
 */

import type { ReactElement } from "react";
import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmActionCard } from "./ConfirmActionCard";
import { CandidatePicker } from "./CandidatePicker";

const action = { id: "act-1", summary: "TASK 등록: 제목 설비점검", fields: [{ label: "제목", value: "설비점검" }, { label: "담당", value: "강승훈" }] };

afterEach(() => vi.unstubAllGlobals());

/** 앱처럼 QueryClientProvider 안에서 그린다 */
function render(ui: ReactElement, client = new QueryClient()) {
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ConfirmActionCard", () => {
  it("confirm calls API once and disables buttons", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "CONFIRMED", resultRef: "t1", link: "/dashboard/kanban" })));
    vi.stubGlobal("fetch", f);
    render(<ConfirmActionCard action={action} />);
    expect(screen.getByText("강승훈")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "등록" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByRole("link", { name: /결과 보기/ })).toBeTruthy());
    expect(f).toHaveBeenCalledTimes(1);
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("/api/chat/actions/act-1/confirm");
    expect(screen.getByRole("link", { name: /결과 보기/ }).getAttribute("href")).toBe("/dashboard/kanban");
    expect(screen.queryByRole("button", { name: "등록" })).toBeNull();
  });

  it("409 shows 이미 처리됨", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "이미 처리된 제안입니다." }), { status: 409 })));
    render(<ConfirmActionCard action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText(/이미 처리/)).toBeTruthy();
  });

  it("cancel calls cancel API", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "CANCELLED" })));
    vi.stubGlobal("fetch", f);
    render(<ConfirmActionCard action={action} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(await screen.findByText(/취소했습니다/)).toBeTruthy();
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("/api/chat/actions/act-1/cancel");
  });
});

describe("ConfirmActionCard 캐시 새로 고침", () => {
  it("등록 성공 후 떠 있지 않은 화면 캐시는 지우고 떠 있는 조회는 다시 받는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "CONFIRMED", link: "/dashboard/holidays" }))));
    const client = new QueryClient();
    client.setQueryData(["holidays", "list", undefined], [{ id: "old" }]);
    render(<ConfirmActionCard action={action} />, client);
    fireEvent.click(screen.getByRole("button", { name: "등록" }));
    await screen.findByRole("link", { name: /결과 보기/ });
    expect(client.getQueryData(["holidays", "list", undefined])).toBeUndefined();
  });

  it("취소는 캐시를 건드리지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "CANCELLED" }))));
    const client = new QueryClient();
    client.setQueryData(["holidays", "list", undefined], [{ id: "old" }]);
    render(<ConfirmActionCard action={action} />, client);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    await screen.findByText(/취소했습니다/);
    expect(client.getQueryData(["holidays", "list", undefined])).toEqual([{ id: "old" }]);
  });
});

describe("ConfirmActionCard danger", () => {
  it("delete card shows red 삭제 button and calls confirm", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "CONFIRMED", resultRef: "m1", link: "/dashboard/milestones" })));
    vi.stubGlobal("fetch", f);
    render(<ConfirmActionCard action={{ id: "act-9", summary: "마일스톤 1건 삭제", fields: [], danger: true }} />);
    const btn = screen.getByRole("button", { name: "삭제" });
    expect(btn.className).toMatch(/red/);
    expect(screen.queryByRole("button", { name: "등록" })).toBeNull();
    fireEvent.click(btn);
    expect(await screen.findByText(/삭제했습니다/)).toBeTruthy();
  });
});

describe("ConfirmActionCard op", () => {
  it("수정 제안은 [수정] 버튼 (회귀: 수정 카드에 [등록]이 보였다)", () => {
    render(<ConfirmActionCard action={{ id: "act-2", summary: "마일스톤 1건 수정", fields: [], op: "update" }} />);
    expect(screen.getByRole("button", { name: "수정" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "등록" })).toBeNull();
  });
});

describe("CandidatePicker", () => {
  it("picker sends label", () => {
    const onPick = vi.fn();
    render(<CandidatePicker candidates={{ prompt: "담당자를 골라 주세요", options: [{ label: "최종무", value: "최종무" }, { label: "최종우", value: "최종우" }] }} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "최종우" }));
    expect(onPick).toHaveBeenCalledWith("최종우");
  });
});
