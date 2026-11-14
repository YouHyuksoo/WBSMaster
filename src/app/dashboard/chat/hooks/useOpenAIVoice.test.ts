/**
 * @file src/app/dashboard/chat/hooks/useOpenAIVoice.test.ts
 * @description 여러 메시지의 공유 재생 상태와 오래된 연결의 경쟁 조건을 검증합니다.
 * 초보자 가이드: WebRTC는 대체하고 React 훅의 실제 상태 전이를 확인합니다.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("./realtime-speech", () => ({ startRealtimeSpeech: mock.start }));
import { useSpeaker } from "./useOpenAIVoice";
function pending() {
  let resolve!: (value: string | null) => void;
  const done = new Promise<string | null>((settle) => { resolve = settle; });
  return { done, resolve, stop: vi.fn(() => resolve(null)) };
}
beforeEach(() => { vi.clearAllMocks(); });
it("다른 답변을 선택하면 이전 연결을 닫고 늦은 완료가 새 상태를 덮지 않는다", async () => {
  const first = pending();
  const second = pending();
  mock.start.mockReturnValueOnce(first).mockReturnValueOnce(second);
  const { result } = renderHook(() => useSpeaker());
  let oldDone!: Promise<string | null>;
  let newDone!: Promise<string | null>;
  act(() => { oldDone = result.current.speak("first", "첫 답변"); });
  expect(result.current.loadingId).toBe("first");
  act(() => { newDone = result.current.speak("second", "둘째 답변"); });
  expect(first.stop).toHaveBeenCalledOnce();
  await act(async () => { await oldDone; });
  expect(result.current.loadingId).toBe("second");
  act(() => { mock.start.mock.calls[0][1](); });
  expect(result.current.loadingId).toBe("second");
  act(() => { mock.start.mock.calls[1][1](); });
  expect(result.current.playingId).toBe("second");
  await act(async () => { second.resolve(null); await newDone; });
  expect(result.current.playingId).toBeNull();
});
it("스트림 중간 오류도 호출자에게 전달하고 상태를 해제한다", async () => {
  const stream = pending();
  mock.start.mockReturnValueOnce(stream);
  const { result } = renderHook(() => useSpeaker());
  let done!: Promise<string | null>;
  act(() => { done = result.current.speak("error", "답변"); });
  await act(async () => { stream.resolve("연결 실패"); expect(await done).toBe("연결 실패"); });
  expect(result.current.loadingId).toBeNull();
});
it("채팅 화면을 벗어나 마지막 구독이 해제되면 연결을 중지한다", async () => {
  const stream = pending();
  mock.start.mockReturnValueOnce(stream);
  const { result, unmount } = renderHook(() => useSpeaker());
  let done!: Promise<string | null>;
  act(() => { done = result.current.speak("unmount", "답변"); });
  unmount();
  expect(stream.stop).toHaveBeenCalledOnce();
  expect(await done).toBeNull();
});
