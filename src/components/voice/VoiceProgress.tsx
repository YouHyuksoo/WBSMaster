/**
 * @file src/components/voice/VoiceProgress.tsx
 * @description
 * 음성 공통 모달의 진행 단계 표시입니다: 올리기(%) → 음성 전사(구간 n/m) → AI 정리 → 확인.
 *
 * 초보자 가이드:
 * - upload 가 숫자(0~1)면 파일을 올리는 중이다. 그 뒤는 서버 작업 상태(status.stage · progress)를 따른다.
 * - 실패하면(failed) 단계 표시를 숨기고 모달이 오류 문구를 보인다.
 */

"use client";

import { Icon } from "@/components/ui";
import type { VoiceIntakeStatus } from "@/lib/api";

const STEPS = ["올리기", "음성 전사", "AI 정리", "확인"] as const;

function stepOf(upload: number | null, status: VoiceIntakeStatus | undefined): number {
  if (upload !== null) return 0;
  switch (status?.stage) {
    case "uploading":
    case "transcribing":
      return 1;
    case "structuring":
      return 2;
    case "done":
      return 3;
    default:
      return -1;
  }
}

export function VoiceProgress({ upload, status, failed }: { upload: number | null; status: VoiceIntakeStatus | undefined; failed: boolean }) {
  const step = stepOf(upload, status);
  if (step < 0 || failed) return null;
  const p = status?.progress;
  const detail =
    step === 0
      ? ` ${Math.round((upload ?? 0) * 100)}%`
      : step === 1 && p && p.total > 1
        ? ` (구간 ${Math.min(p.done + 1, p.total)}/${p.total})`
        : step === 1
          ? " (녹음 길이에 따라 몇 분 걸립니다)"
          : "";

  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="진행 단계">
        {STEPS.map((label, i) => {
          const state = i < step || step === 3 ? "done" : i === step ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span className="w-6 h-px bg-border dark:bg-border-dark" aria-hidden="true" />}
              <span className={`flex items-center gap-1 ${state === "todo" ? "text-text-secondary" : state === "active" ? "text-primary font-semibold" : "text-success"}`}>
                <Icon
                  name={state === "done" ? "check_circle" : state === "active" ? "progress_activity" : "radio_button_unchecked"}
                  size="xs"
                  className={state === "active" ? "animate-spin motion-reduce:animate-none" : ""}
                />
                {label}
                {state === "active" && detail}
              </span>
            </li>
          );
        })}
      </ol>
      {step === 0 && (
        <div className="h-1.5 rounded-full bg-surface dark:bg-background-dark overflow-hidden" aria-hidden="true">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round((upload ?? 0) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
