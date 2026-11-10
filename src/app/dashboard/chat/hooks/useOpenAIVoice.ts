/**
 * @file src/app/dashboard/chat/hooks/useOpenAIVoice.ts
 * @description
 * AI 어시스턴트 채팅의 음성 입력(녹음 → OpenAI 전사)과 음성 출력(답변 → OpenAI 읽기)을 다루는 훅입니다.
 *
 * 초보자 가이드:
 * - useVoiceRecorder(onText): 마이크 버튼 토글. 녹음을 멈추면 /api/voice/transcribe 로 보내 글자를 onText 로 넘긴다.
 * - useSpeaker(): 답변 읽기. 한 번에 하나만 재생하고(다른 답변을 누르면 앞의 것은 멈춤) 어떤 답변을 읽는지 알려 준다.
 *   재생기는 모듈에 하나만 두어 메시지마다 상태를 나눠 갖지 않는다.
 * - 자동 읽기 여부는 이 브라우저에만 저장한다 (localStorage, 실패해도 꺼진 상태로 동작).
 */

"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ───────── 음성 입력 ───────── */

const noopSubscribe = () => () => {};

export function useVoiceRecorder(onText: (text: string) => void, onError: (message: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  // 서버 렌더에서는 false, 브라우저에서는 실제 지원 여부 (hydration 어긋남 없이)
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined",
    () => false
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => () => recorderRef.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const send = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", blob, "voice");
        const res = await fetch("/api/voice/transcribe", { method: "POST", body: form, credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "음성을 글자로 바꾸지 못했습니다.");
        if (data.text) onText(data.text);
      } catch (err) {
        onError(err instanceof Error ? err.message : "음성을 글자로 바꾸지 못했습니다.");
      } finally {
        setIsTranscribing(false);
      }
    },
    [onText, onError]
  );

  const toggle = useCallback(async () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recorderRef.current = null;
        if (blob.size > 0) void send(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      onError("마이크 사용 권한이 필요합니다. 브라우저에서 마이크 권한을 허용해주세요.");
    }
  }, [isRecording, send, onError]);

  return { supported, isRecording, isTranscribing, toggle };
}

/* ───────── 음성 출력 ───────── */

type SpeakerState = { playingId: string | null; loadingId: string | null };
let state: SpeakerState = { playingId: null, loadingId: null };
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let requestSeq = 0;
const listeners = new Set<() => void>();

function setState(next: SpeakerState) {
  state = next;
  listeners.forEach((l) => l());
}

function stopPlayback() {
  requestSeq++;
  audio?.pause();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  audio = null;
  objectUrl = null;
  setState({ playingId: null, loadingId: null });
}

/** 답변 읽기 (실패하면 오류 문구를 돌려준다) */
async function speak(id: string, text: string): Promise<string | null> {
  stopPlayback();
  const seq = requestSeq;
  setState({ playingId: null, loadingId: id });
  try {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "답변을 읽지 못했습니다.");
    }
    const blob = await res.blob();
    if (seq !== requestSeq) return null; // 그 사이 다른 답변을 눌렀다
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.onended = () => stopPlayback();
    await audio.play();
    setState({ playingId: id, loadingId: null });
    return null;
  } catch (err) {
    if (seq === requestSeq) setState({ playingId: null, loadingId: null });
    return err instanceof Error ? err.message : "답변을 읽지 못했습니다.";
  }
}

export function useSpeaker() {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state
  );
  return { ...snapshot, speak, stop: stopPlayback };
}

/* ───────── 자동 읽기 설정 (이 브라우저만) ───────── */

const AUTO_KEY = "wbs-chat-auto-speak";
const autoListeners = new Set<() => void>();
let autoMemory = false; // 저장소를 못 쓸 때 쓰는 값

function readAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) === "1";
  } catch {
    return autoMemory;
  }
}

export function useAutoSpeak(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (l) => {
      autoListeners.add(l);
      return () => autoListeners.delete(l);
    },
    readAuto,
    () => false
  );
  const update = useCallback((next: boolean) => {
    autoMemory = next;
    if (!next) stopPlayback();
    try {
      localStorage.setItem(AUTO_KEY, next ? "1" : "0");
    } catch {
      /* 무시: autoMemory 로 동작 */
    }
    autoListeners.forEach((l) => l());
  }, []);
  return [on, update];
}
