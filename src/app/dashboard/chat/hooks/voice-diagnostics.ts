/**
 * @file src/app/dashboard/chat/hooks/voice-diagnostics.ts
 * @description 무음 진단을 위해 음성 연결 단계와 재생 상태만 브라우저 메모리에 기록합니다.
 * 초보자 가이드:
 * - 키·SDP·답변·음성·전사문은 기록하지 않습니다.
 * - window.__wbsVoiceTrace의 최근 80건만 유지하며 새로고침하면 없어집니다.
 */
type Entry = { run: number; at: number; stage: string; data?: Record<string, string | number | boolean> };
type TraceWindow = Window & { __wbsVoiceTrace?: Entry[] };
let runSequence = 0;

export function beginVoiceTrace() {
  const run = ++runSequence;
  return (stage: string, data?: Entry["data"]) => {
    const target = window as TraceWindow;
    const entries = target.__wbsVoiceTrace ?? [];
    entries.push({ run, at: Date.now(), stage, data });
    target.__wbsVoiceTrace = entries.slice(-80);
  };
}
