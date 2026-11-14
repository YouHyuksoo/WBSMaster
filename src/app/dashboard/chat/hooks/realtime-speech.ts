/**
 * @file src/app/dashboard/chat/hooks/realtime-speech.ts
 * @description 답변을 OpenAI Realtime WebRTC 스트림으로 재생하고 연결 수명을 관리합니다.
 * 초보자 가이드:
 * - 수신 전용 트랙으로 마이크 권한을 요청하지 않습니다.
 * - response.done은 생성 완료이며, 출력 버퍼가 비워질 때까지 연결을 유지합니다.
 * - stop은 요청·트랙·데이터 채널·연결과 타이머를 모두 정리합니다.
 */
import { beginVoiceTrace } from "@/app/dashboard/chat/hooks/voice-diagnostics";

export type RealtimePlayback = { done: Promise<string | null>; stop: () => void };

export function startRealtimeSpeech(text: string, onPlaying: () => void): RealtimePlayback {
  const controller = new AbortController();
  const trace = beginVoiceTrace();
  trace("start");
  let pc: RTCPeerConnection | null = null;
  let channel: RTCDataChannel | null = null;
  let audio: HTMLAudioElement | null = null;
  let finished = false;
  let started = false;
  let mediaPlaying = false;
  let serverPlaying = false;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  let settle!: (error: string | null) => void;
  const done = new Promise<string | null>((resolve) => { settle = resolve; });

  function finish(error: string | null = null) {
    if (finished) return;
    finished = true;
    trace("finish", { error: error !== null, started, mediaPlaying, serverPlaying });
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    controller.abort();
    window.removeEventListener("pagehide", stop);
    if (audio) {
      audio.onplaying = null;
      audio.onerror = null;
      audio.pause();
      audio.srcObject = null;
    }
    channel?.close();
    pc?.getReceivers().forEach((receiver) => receiver.track?.stop());
    pc?.close();
    settle(error);
  }
  function stop() { finish(); }
  function playing() {
    if (finished || started || !mediaPlaying || !serverPlaying) return;
    started = true;
    clearTimeout(startTimer);
    onPlaying();
  }
  window.addEventListener("pagehide", stop);
  startTimer = setTimeout(() => finish("Realtime 음성 연결 또는 재생 시작 시간이 초과됐습니다. 다시 눌러주세요."), 30000);
  endTimer = setTimeout(() => finish("음성 재생 제한 시간을 초과했습니다. 다시 눌러주세요."), 300000);

  void (async () => {
    try {
      if (typeof RTCPeerConnection === "undefined") throw new Error("이 브라우저는 WebRTC 음성 재생을 지원하지 않습니다.");
      pc = new RTCPeerConnection();
      audio = new Audio();
      audio.autoplay = true;
      audio.onplaying = () => {
        mediaPlaying = true;
        trace("media.playing", { paused: audio!.paused, volume: audio!.volume, muted: audio!.muted });
        playing();
      };
      audio.onerror = () => finish("브라우저에서 음성 스트림을 재생하지 못했습니다.");
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.ontrack = (event) => {
        if (finished || !audio) return;
        trace("remote.track", { muted: event.track.muted, enabled: event.track.enabled });
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audio.play().catch(() => {
          trace("media.play.rejected");
          finish("음성 재생이 차단됐습니다. 브라우저의 소리 허용 상태를 확인하고 스피커를 다시 눌러주세요.");
        });
      };
      pc.onconnectionstatechange = () => {
        trace("peer.state", { state: pc?.connectionState ?? "closed" });
        if (pc?.connectionState === "failed") finish("Realtime 음성 연결이 끊겼습니다. 다시 눌러주세요.");
      };
      channel = pc.createDataChannel("oai-events");
      channel.onopen = () => {
        if (finished) return;
        trace("channel.open");
        // 서버의 낭독 지시와 원문만 사용하고 대화 이력은 누적하지 않습니다.
        channel?.send(JSON.stringify({
          type: "response.create",
          response: { conversation: "none", output_modalities: ["audio"], input: [] },
        }));
      };
      channel.onmessage = (message) => {
        if (finished) return;
        try {
          const event = JSON.parse(message.data);
          if (event.type === "output_audio_buffer.started") { trace("server.audio.started"); serverPlaying = true; playing(); }
          if (event.type === "output_audio_buffer.stopped") {
            trace("server.audio.stopped");
            finish(started ? null : "서버 음성은 생성됐지만 브라우저 재생을 확인하지 못했습니다. 스피커를 다시 눌러주세요.");
          }
          if (event.type === "error") {
            const code = typeof event.error?.code === "string" && /^[a-z_]{1,80}$/.test(event.error.code) ? event.error.code : "unknown";
            trace("server.error", { code });
            finish(`OpenAI Realtime 음성 오류 (${code}). 다시 눌러주세요.`);
          }
          if (event.type === "response.done" && event.response?.status !== "completed") {
            trace("server.response.failed");
            finish("OpenAI Realtime 음성을 생성하지 못했습니다. 모델 접근 권한과 사용 한도를 확인해주세요.");
          }
        } catch { finish("음성 서버의 응답을 처리하지 못했습니다."); }
      };
      channel.onclose = () => { if (!finished) finish("Realtime 음성 연결이 종료됐습니다. 다시 눌러주세요."); };
      channel.onerror = () => finish("Realtime 음성 데이터 연결에 실패했습니다.");
      const offer = await pc.createOffer();
      if (finished) return;
      await pc.setLocalDescription(offer);
      if (finished) return;
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ text, sdp: offer.sdp }),
      });
      trace("session.http", { status: response.status });
      if (finished) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Realtime 음성 연결을 시작하지 못했습니다.");
      }
      const sdp = await response.text();
      if (finished) return;
      await pc.setRemoteDescription({ type: "answer", sdp });
    } catch (error) {
      if (!finished) finish(error instanceof Error ? error.message : "음성 재생에 실패했습니다.");
    }
  })();
  return { done, stop };
}
