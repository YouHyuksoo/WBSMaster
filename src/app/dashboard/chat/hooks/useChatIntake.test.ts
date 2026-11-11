/**
 * @file src/app/dashboard/chat/hooks/useChatIntake.test.ts
 * @description 프로젝트 전환 중 늦게 도착한 초안이 섞이지 않는지 확인합니다.
 * 초보자 가이드: fetch는 고정 응답으로 대체하며 실제 서버를 호출하지 않습니다.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useChatIntake } from "./useChatIntake";
it("프로젝트가 바뀌면 이전 목록의 늦은 응답을 무시한다", async () => {
  let finish!: (v: Response) => void;
  vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("projectId=p1") ? new Promise<Response>((r) => { finish = r; }) : Promise.resolve(new Response("[]"))));
  const { result, rerender } = renderHook(({ project }) => useChatIntake(project, vi.fn()), { initialProps: { project: "p1" } });
  rerender({ project: "p2" });
  await act(async () => finish(new Response(JSON.stringify([{ id: "private-p1", target: "issue" }]))));
  expect(result.current.drafts).toEqual([]);
  vi.unstubAllGlobals();
});
it("초안을 선택하면 서버에 보관된 내용을 복구한다", async () => {
  const response = { content: "날짜를 알려 주세요", intake: { id: "d1", target: "interview", revision: 2, status: "COLLECTING", items: [], questions: [], expiresAt: "2027-01-01" } };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("/intakes/d1") ? response : [{ id: "d1", target: "interview" }]))));
  const { result } = renderHook(() => useChatIntake("p1", vi.fn()));
  await waitFor(() => expect(result.current.drafts).toHaveLength(1));
  await act(async () => result.current.adopt("d1"));
  expect(result.current.reply?.intake.revision).toBe(2);
  act(() => result.current.leave());
  expect(result.current.reply).toBeNull();
  vi.unstubAllGlobals();
});
