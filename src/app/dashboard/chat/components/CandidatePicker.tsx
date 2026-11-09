/**
 * @file src/app/dashboard/chat/components/CandidatePicker.tsx
 * @description
 * AI 채팅 후보 선택 버튼입니다. 사람 이름이 애매할 때(예: 최종무/최종우) 후보를 보여 주고, 고른 이름을 다음 메시지로 보냅니다.
 *
 * 초보자 가이드:
 * - onPick(label): 페이지가 이 값을 사용자 메시지로 보내 대화를 이어 간다
 * - 색: bg-{색}-500/10 + text-{색}-600 dark:text-{색}-400 (파스텔 금지 규칙)
 */

"use client";

export interface CandidatesView {
  prompt: string;
  options: { label: string; value: string }[];
}

export function CandidatePicker({ candidates, onPick }: { candidates: CandidatesView; onPick: (label: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {candidates.options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onPick(o.label)}
          className="px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
