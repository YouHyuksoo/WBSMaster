/**
 * @file src/app/dashboard/chat/hooks/realtime-speech.test.ts
 * @description WebRTC 낭독의 스트리밍·종료·중지·실패 수명을 검증합니다.
 * 초보자 가이드: 브라우저 미디어와 fetch를 대체하며 실제 OpenAI에 접속하지 않습니다.
 */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startRealtimeSpeech, type RealtimePlayback } from "./realtime-speech";

class FakeChannel {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  emit(event: object) { this.onmessage?.({ data: JSON.stringify(event) }); }
}
class FakePeer {
  static instances: FakePeer[] = [];
  channel = new FakeChannel();
  connectionState = "new";
  ontrack: ((event: { streams: object[]; track: object }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  track = { stop: vi.fn() };
  addTransceiver = vi.fn();
  createDataChannel = vi.fn(() => this.channel);
  createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" }));
  setLocalDescription = vi.fn(async () => {});
  setRemoteDescription = vi.fn(async () => {});
  close = vi.fn();
  getReceivers = () => [{ track: this.track }];
  constructor() { FakePeer.instances.push(this); }
}
const media = { autoplay: false, srcObject: null as object | null, onplaying: null as (() => void) | null, onerror: null as (() => void) | null, play: vi.fn(), pause: vi.fn() };
let playback: RealtimePlayback;
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  FakePeer.instances = [];
  media.play.mockResolvedValue(undefined);
  media.srcObject = null;
  vi.stubGlobal("RTCPeerConnection", FakePeer);
  vi.stubGlobal("Audio", function () { return media; });
  fetcher = vi.fn().mockImplementation(async () => new Response("answer-sdp", { headers: { "Content-Type": "application/sdp" } }));
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => { playback?.stop(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function connected() {
  const peer = FakePeer.instances.at(-1)!;
  await vi.waitFor(() => expect(peer.setRemoteDescription).toHaveBeenCalled());
  peer.channel.onopen?.();
  return peer;
}
it("서버 전송 시작만으로 재생 중이라고 표시하거나 시작 제한 시간을 해제하지 않는다", async () => {
  const playing = vi.fn();
  playback = startRealtimeSpeech("답변", playing);
  const peer = await connected();
  peer.channel.emit({ type: "output_audio_buffer.started" });
  expect(playing).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(30000);
  expect(await playback.done).toContain("초과");
});
it("마이크 없이 수신 전용으로 연결하고 원격 스트림을 즉시 재생한다", async () => {
  const playing = vi.fn();
  playback = startRealtimeSpeech("답변", playing);
  const peer = await connected();
  expect(peer.addTransceiver).toHaveBeenCalledWith("audio", { direction: "recvonly" });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ text: "답변", sdp: "offer-sdp" });
  expect(peer.setRemoteDescription).toHaveBeenCalledWith({ type: "answer", sdp: "answer-sdp" });
  expect(JSON.parse(peer.channel.send.mock.calls[0][0])).toMatchObject({ type: "response.create", response: { output_modalities: ["audio"], conversation: "none", input: [] } });
  const stream = {};
  peer.ontrack?.({ streams: [stream], track: peer.track });
  expect(media.srcObject).toBe(stream);
  expect(media.play).toHaveBeenCalledOnce();
  media.onplaying?.();
  expect(playing).not.toHaveBeenCalled();
  peer.channel.emit({ type: "output_audio_buffer.started" });
  expect(playing).toHaveBeenCalledOnce();
});
it("생성 완료 후에도 재생을 유지하고 실제 출력 버퍼 종료 때 닫는다", async () => {
  playback = startRealtimeSpeech("답변", vi.fn());
  const peer = await connected();
  media.onplaying?.();
  peer.channel.emit({ type: "output_audio_buffer.started" });
  peer.channel.emit({ type: "response.done", response: { status: "completed" } });
  expect(peer.close).not.toHaveBeenCalled();
  peer.channel.emit({ type: "output_audio_buffer.stopped" });
  expect(await playback.done).toBeNull();
  expect(peer.close).toHaveBeenCalledOnce();
  expect(peer.track.stop).toHaveBeenCalledOnce();
  expect(media.srcObject).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it("서버 음성 종료까지 실제 브라우저 재생이 없으면 성공으로 처리하지 않는다", async () => {
  playback = startRealtimeSpeech("답변", vi.fn());
  const peer = await connected();
  peer.channel.emit({ type: "output_audio_buffer.started" });
  peer.channel.emit({ type: "output_audio_buffer.stopped" });
  expect(await playback.done).toContain("재생을 확인하지 못했습니다");
});
it("연결 도중 중지는 fetch를 취소하고 늦은 응답으로 재생하지 않는다", async () => {
  let resolve!: (value: Response) => void;
  fetcher.mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
  const playing = vi.fn();
  playback = startRealtimeSpeech("답변", playing);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
  playback.stop();
  expect(await playback.done).toBeNull();
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  resolve(new Response("late-answer"));
  await Promise.resolve();
  expect(FakePeer.instances[0].setRemoteDescription).not.toHaveBeenCalled();
  expect(playing).not.toHaveBeenCalled();
});
it("HTTP 오류와 자동재생 거부를 호출자에게 전달한다", async () => {
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: "키 없음" }), { status: 400 }));
  playback = startRealtimeSpeech("답변", vi.fn());
  await vi.waitFor(async () => expect(await playback.done).toBe("키 없음"));
  playback = startRealtimeSpeech("답변", vi.fn());
  const peer = await connected();
  // 두 번째 연결을 선택합니다.
  const current = FakePeer.instances.at(-1)!;
  media.play.mockRejectedValueOnce(new Error("NotAllowedError"));
  current.ontrack?.({ streams: [{}], track: peer.track });
  expect(await playback.done).toContain("재생이 차단");
});
it("서버 오류·연결 실패와 시작 시간 초과는 연결을 정리한다", async () => {
  playback = startRealtimeSpeech("답변", vi.fn());
  const peer = await connected();
  peer.channel.emit({ type: "error", error: { message: "sensitive" } });
  expect(await playback.done).toContain("오류");
  playback = startRealtimeSpeech("답변", vi.fn());
  FakePeer.instances.at(-1)!.connectionState = "failed";
  FakePeer.instances.at(-1)!.onconnectionstatechange?.();
  expect(await playback.done).toContain("끊겼습니다");
  playback = startRealtimeSpeech("답변", vi.fn());
  await vi.advanceTimersByTimeAsync(30000);
  expect(await playback.done).toContain("초과");
  expect(vi.getTimerCount()).toBe(0);
});
it("화면 이탈 시 재생을 종료한다", async () => {
  playback = startRealtimeSpeech("답변", vi.fn());
  const peer = await connected();
  window.dispatchEvent(new Event("pagehide"));
  expect(await playback.done).toBeNull();
  expect(peer.close).toHaveBeenCalledOnce();
});
