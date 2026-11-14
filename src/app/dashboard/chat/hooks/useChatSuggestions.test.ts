/**
 * @file src/app/dashboard/chat/hooks/useChatSuggestions.test.ts
 * @description 제안의 프로젝트 분리·새로고침·오류 보존을 검증합니다.
 * 초보자 가이드: fetch를 목 처리해 응답 순서 역전을 재현합니다.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EXAMPLE_GROUPS } from "@/lib/chat-suggestions";
import { suggestionStorageKey, useChatSuggestions } from "./useChatSuggestions";
const notice = { success: vi.fn(), error: vi.fn() };
const generated = EXAMPLE_GROUPS.map(g => ({ ...g, questions: g.questions.map(q => `${q} (맞춤)`) }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());
it("생성된 전체 분류는 같은 프로젝트 재방문에 복원된다", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ source: "ai", suggestions: generated })));
  const a = renderHook(() => useChatSuggestions("a", notice));
  await act(() => a.result.current.refreshSuggestions());
  expect(a.result.current.suggestions).toEqual(generated);
  a.unmount();
  const b = renderHook(() => useChatSuggestions("a", notice));
  expect(b.result.current.suggestions).toEqual(generated);
});
it("다른 프로젝트로 전환하면 이전 요청 응답을 무시한다", async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  const h = renderHook(({ id }) => useChatSuggestions(id, notice), { initialProps: { id: "a" } });
  let request!: Promise<void>;
  act(() => { request = h.result.current.refreshSuggestions(); });
  h.rerender({ id: "b" });
  await act(async () => { resolve(Response.json({ source: "ai", suggestions: generated })); await request; });
  expect(h.result.current.suggestions).toEqual(EXAMPLE_GROUPS);
  expect(h.result.current.isRefreshingSuggestions).toBe(false);
  expect(localStorage.getItem(suggestionStorageKey("b"))).toBeNull();
  h.rerender({ id: "a" });
  expect(h.result.current.isRefreshingSuggestions).toBe(false);
});
it("오류 응답은 기존 제안을 유지하면서 이유를 안내한다", async () => {
  localStorage.setItem(suggestionStorageKey("a"), JSON.stringify(generated));
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ source: "error", suggestions: EXAMPLE_GROUPS, message: "생성 실패" })));
  const h = renderHook(() => useChatSuggestions("a", notice));
  await act(() => h.result.current.refreshSuggestions());
  expect(h.result.current.suggestions).toEqual(generated);
  expect(notice.error).toHaveBeenCalledWith("생성 실패");
});
it("401 응답과 손상된 캐시는 처리하고 중복 클릭은 한 번만 요청한다", async () => {
  localStorage.setItem(suggestionStorageKey("a"), "깨진 JSON");
  const f = vi.fn(async () => Response.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  vi.stubGlobal("fetch", f);
  const h = renderHook(() => useChatSuggestions("a", notice));
  await act(async () => { await Promise.all([h.result.current.refreshSuggestions(), h.result.current.refreshSuggestions()]); });
  expect(f).toHaveBeenCalledOnce();
  await waitFor(() => expect(notice.error).toHaveBeenCalledWith("로그인이 필요합니다."));
  expect(h.result.current.suggestions).toEqual(EXAMPLE_GROUPS);
});
