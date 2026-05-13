/**
 * @file src/app/dashboard/progress-risk/components/StageStepper.tsx
 * @description 9 dot 단계 진행 바 — 클릭으로 currentStage 변경
 *
 * 초보자 가이드:
 * 1. **색상 로직**: 완료(idx < currentIdx) = 초록, 현재 = 청록 발광, 미진행 = 흰색 투명
 * 2. **compact**: true면 3x3 dot (그리드용), false면 텍스트 라벨
 * 3. **클릭**: disabled 아니면 onChange(stage) 호출
 * 4. **접근성**: aria-label, role="group", title 속성 포함
 */
"use client";

import type { ProgressStage } from "../types";
import { STAGE_ORDER, STAGE_LABEL, STAGE_SHORT } from "../constants";

interface Props {
  currentStage: ProgressStage;
  onChange: (stage: ProgressStage) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function StageStepper({ currentStage, onChange, compact = true, disabled = false }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="단계 진행 바">
      {STAGE_ORDER.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const bg = isCurrent
          ? "bg-[#00f3ff] shadow-[0_0_4px_rgba(0,243,255,0.6)]"
          : isDone
            ? "bg-green-500"
            : "bg-white/10 dark:bg-white/5";

        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(stage)}
            title={`${STAGE_LABEL[stage]} (${idx + 1}/${STAGE_ORDER.length})`}
            className={`${bg} rounded-sm transition-all hover:scale-110 ${
              compact ? "w-3 h-3" : "px-2 py-1 text-[10px] text-white"
            } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={STAGE_LABEL[stage]}
            aria-current={isCurrent ? "step" : undefined}
          >
            {!compact && STAGE_SHORT[stage]}
          </button>
        );
      })}
    </div>
  );
}
