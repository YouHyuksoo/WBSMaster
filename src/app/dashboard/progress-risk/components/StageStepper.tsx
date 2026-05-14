/**
 * @file src/app/dashboard/progress-risk/components/StageStepper.tsx
 * @description 카테고리별 동적 단계 진행 바
 *
 * 초보자 가이드:
 * 1. **stages**: 그 task가 속한 카테고리의 단계 목록 (order asc 정렬 권장)
 * 2. **currentStageId**: 현재 단계 ID. null이면 진척률 0%
 * 3. **variant**: "dot"(작은 점) / "full"(라벨 표시)
 * 4. **stages.length === 0**: "단계 미정의" 안내 표시
 */
"use client";

import type { ProgressStageDef } from "@/lib/api";

interface Props {
  stages: ProgressStageDef[];
  currentStageId: string | null;
  onChange: (stageId: string) => void;
  variant?: "dot" | "full";
  disabled?: boolean;
}

export function StageStepper({ stages, currentStageId, onChange, variant = "full", disabled = false }: Props) {
  const isDot = variant === "dot";

  if (stages.length === 0) {
    return (
      <span className="text-[10px] text-text-secondary italic">단계 미정의</span>
    );
  }

  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIdx = sorted.findIndex((s) => s.id === currentStageId);

  return (
    <div className="flex items-center gap-1 flex-nowrap" role="group" aria-label="단계 진행 바">
      {sorted.map((stage, idx) => {
        const isDone = currentIdx >= 0 && idx < currentIdx;
        const isCurrent = idx === currentIdx;

        const bg = isDot
          ? isCurrent
            ? "bg-[#00f3ff] shadow-[0_0_4px_rgba(0,243,255,0.6)]"
            : isDone
              ? "bg-green-500"
              : "bg-white/10 dark:bg-white/5"
          : isCurrent
            ? "bg-[#00f3ff] text-black font-bold shadow-[0_0_6px_rgba(0,243,255,0.5)] border border-[#00f3ff]"
            : isDone
              ? "bg-green-500/20 text-green-600 dark:text-green-300 border border-green-500/40"
              : "bg-white/5 text-text-secondary border border-border dark:border-border-dark";

        return (
          <button
            key={stage.id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(stage.id)}
            title={`${stage.name} (${idx + 1}/${sorted.length})`}
            className={`${bg} rounded transition-all hover:scale-105 whitespace-nowrap ${
              isDot ? "w-3 h-3" : "px-2 py-1 text-[11px]"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={stage.name}
            aria-current={isCurrent ? "step" : undefined}
          >
            {!isDot && stage.name}
          </button>
        );
      })}
    </div>
  );
}
