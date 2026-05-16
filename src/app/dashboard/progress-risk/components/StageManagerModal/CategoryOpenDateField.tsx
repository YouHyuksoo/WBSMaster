/**
 * @file CategoryOpenDateField.tsx
 * @description 카테고리 최종 오픈일자 입력 (raw input, 컴팩트)
 *
 * 초보자 가이드:
 * 1. **localValue**: 사용자가 변경 중인 임시 값
 * 2. **onSave**: blur 시점에만 호출 (이전 값과 다를 때)
 */
"use client";

import { useState } from "react";

interface Props {
  value: string;
  disabled: boolean;
  onSave: (value: string) => void;
}

export function CategoryOpenDateField({ value, disabled, onSave }: Props) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    if (localValue !== value) onSave(localValue);
  };

  return (
    <input
      type="date"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      aria-label="최종 오픈일자"
      className="h-9 w-[148px] rounded-lg border border-border bg-surface px-2.5 text-xs text-text
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
        disabled:opacity-50
        dark:border-border-dark dark:bg-background-dark dark:text-white"
    />
  );
}
