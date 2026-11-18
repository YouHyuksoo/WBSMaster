/**
 * @file src/components/voice/VoiceOptions.tsx
 * @description
 * 음성 공통 모달의 전사 설정입니다: 기본 일자 · 전사 방식(고품질 / 화자 구분) · 용어 힌트(기본 / 직접 입력 / 없음).
 *
 * 초보자 가이드:
 * - 고품질: gpt-4o-transcribe 로 전사하고 용어 힌트를 함께 보낸다. 화자는 나누지 않는다.
 * - 화자 구분: 말한 사람을 A · B 로 나누지만 용어 힌트를 쓰지 못해 업무 용어 정확도가 낮다 (힌트 칸을 숨긴다).
 * - 힌트 "기본" 은 고른 종류의 기본 문장, "직접 입력" 은 기본 문장을 채워 두고 고쳐 쓰게 한다. 최대 500자.
 * - 값은 모달(VoiceIntakeModal)이 가지고, 이 컴포넌트는 보여 주고 바꾸기만 한다.
 */

"use client";

import { MAX_HINT_CHARS, type VoiceMode } from "@/lib/voice-intake-rules";

export type HintMode = "default" | "custom" | "none";

interface Props {
  disabled: boolean;
  date: string;
  onDate: (v: string) => void;
  mode: VoiceMode;
  onMode: (v: VoiceMode) => void;
  hintMode: HintMode;
  onHintMode: (v: HintMode) => void;
  defaultHint: string;
  customHint: string;
  onCustomHint: (v: string) => void;
}

const SEG = "px-3 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-50";
const ON = "border-primary bg-primary/10 text-primary font-semibold";
const OFF = "border-border dark:border-border-dark text-text-secondary hover:border-primary/50";

const MODES: Array<{ value: VoiceMode; label: string; desc: string }> = [
  { value: "quality", label: "고품질", desc: "업무 용어 힌트를 써서 정확하게 받아 적습니다. 화자는 나누지 않습니다." },
  { value: "diarize", label: "화자 구분", desc: "말한 사람을 A · B 로 나눕니다. 이름은 모르고, 20분 구간마다 표시가 새로 매겨지며, 용어 힌트를 쓰지 못해 용어 정확도가 낮습니다." },
];

const HINTS: Array<{ value: HintMode; label: string }> = [
  { value: "default", label: "기본 힌트" },
  { value: "custom", label: "직접 입력" },
  { value: "none", label: "힌트 없음" },
];

export function VoiceOptions(p: Props) {
  return (
    <fieldset disabled={p.disabled} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
      <label className="block">
        <span className="block text-sm font-medium text-text dark:text-white mb-1">기본 일자</span>
        <input type="date" value={p.date} onChange={(e) => p.onDate(e.target.value)}
          className="w-full px-3 py-2 bg-background-white dark:bg-background-dark border border-border dark:border-border-dark rounded-lg text-sm text-text dark:text-white" />
      </label>

      <div className="space-y-3 min-w-0">
        <div>
          <span className="block text-sm font-medium text-text dark:text-white mb-1">전사 방식</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="전사 방식">
            {MODES.map((m) => (
              <button key={m.value} type="button" aria-pressed={p.mode === m.value} onClick={() => p.onMode(m.value)}
                className={`${SEG} ${p.mode === m.value ? ON : OFF}`}>
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-secondary">{MODES.find((m) => m.value === p.mode)?.desc}</p>
        </div>

        {p.mode === "quality" && (
          <div>
            <span className="block text-sm font-medium text-text dark:text-white mb-1">용어 힌트</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="용어 힌트">
              {HINTS.map((h) => (
                <button key={h.value} type="button" aria-pressed={p.hintMode === h.value} onClick={() => p.onHintMode(h.value)}
                  className={`${SEG} ${p.hintMode === h.value ? ON : OFF}`}>
                  {h.label}
                </button>
              ))}
            </div>
            {p.hintMode === "default" && <p className="mt-1 text-xs text-text-secondary break-words">{p.defaultHint}</p>}
            {p.hintMode === "none" && <p className="mt-1 text-xs text-text-secondary">힌트 없이 받아 적습니다. 업무 용어가 틀리게 적힐 수 있습니다.</p>}
            {p.hintMode === "custom" && (
              <div className="mt-2">
                <textarea value={p.customHint} maxLength={MAX_HINT_CHARS} onChange={(e) => p.onCustomHint(e.target.value)} aria-label="용어 힌트 직접 입력"
                  placeholder="예: 한국어 업무 회의입니다. MES, LOT, 인터락, 절곡, 트레이, 혼입방지, 레시피 같은 용어가 나옵니다."
                  className="w-full min-h-20 px-3 py-2 bg-background-white dark:bg-background-dark border border-border dark:border-border-dark rounded-lg text-sm text-text dark:text-white" />
                <p className="text-xs text-text-secondary tabular-nums text-right">
                  {p.customHint.length}/{MAX_HINT_CHARS} · 녹음에 나올 사람 이름 · 설비 · 제품 · 약어를 적으면 정확도가 올라갑니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
}
