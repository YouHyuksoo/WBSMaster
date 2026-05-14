/**
 * @file src/app/dashboard/progress-risk/components/StageStepper.tsx
 * @description 9 단계 진행 바 — 클릭으로 currentStage 변경
 *
 * 초보자 가이드:
 * 1. **색상 로직**: 완료(idx < currentIdx) = 초록, 현재 = 청록 발광, 미진행 = 회색
 * 2. **variant**: "full"(기본)이면 전체 단계 라벨 펼쳐서 표시, "dot"이면 3x3 dot
 * 3. **클릭**: disabled 아니면 onChange(stage) 호출
 * 4. **접근성**: aria-label, role="group", title 속성 포함
 */
"use client";

import type { ProgressStage } from "../types";
import { STAGE_ORDER, STAGE_LABEL } from "../constants";

interface Props {
  currentStage: ProgressStage;
  onChange: (stage: ProgressStage) => void;
  /** "dot" = 점 3x3, "full" = 전체 라벨 펼쳐서 표시 */
  variant?: "dot" | "full";
  disabled?: boolean;
}

export function StageStepper({ currentStage, onChange, variant = "full", disabled = false }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const isDot = variant === "dot";

  return (
    <div className="flex items-center gap-1 flex-nowrap" role="group" aria-label="단계 진행 바">
      {STAGE_ORDER.map((stage, idx) => {
        const isDone = idx < currentIdx;
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
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(stage)}
            title={`${STAGE_LABEL[stage]} (${idx + 1}/${STAGE_ORDER.length})`}
            className={`${bg} rounded transition-all hover:scale-105 whitespace-nowrap ${
              isDot ? "w-3 h-3" : "px-2 py-1 text-[11px]"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={STAGE_LABEL[stage]}
            aria-current={isCurrent ? "step" : undefined}
          >
            {!isDot && STAGE_LABEL[stage]}
          </button>
        );
      })}
    </div>
  );
}
