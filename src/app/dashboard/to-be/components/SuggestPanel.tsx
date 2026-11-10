/**
 * @file src/app/dashboard/to-be/components/SuggestPanel.tsx
 * @description TO-BE AI 초안 제안 결과 패널 (4단계). 현재 값과 제안 값을 나란히 보여 주고, 고른 항목만 적용한다.
 *
 * 초보자 가이드:
 * 1. 개요 칸(변화 유형 · 목표 방식 · 우선순위 · 개선 요약 · 연결 SFR)은 체크한 것만 "개요에 적용"으로 저장한다
 *    - 값이 같은 칸은 체크를 끈 채로 시작한다. 연결 SFR 은 기존 코드에 더한다(지우지 않음)
 *    - 연결 AS-IS · WBS 는 보내지 않는다 (그대로 유지)
 * 2. 개선 매핑 후보는 체크한 것만 기존 매핑 뒤에 "미해결"로 더한다 (기존 매핑은 그대로)
 * 3. 아무것도 자동 저장하지 않는다. 닫으면 제안은 버려진다
 */
"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import type { ToBeDesign, ToBeIssueFix, ToBeItemInput, ToBeSuggestion } from "@/lib/api";
import { CHANGE_TYPE_CONFIG, PRIORITY_LABEL, TARGET_METHOD_CONFIG } from "../types";

type Item = ToBeDesign["item"];
type Field = "changeType" | "targetMethod" | "priority" | "summary" | "sfrCodes";

const priorityText = (p: Item["priority"]) => (p ? PRIORITY_LABEL[p] : "-");

/** 개선 매핑 저장 목록 = 기존 매핑(그대로) + 고른 제안("미해결"). 저장은 목록 전체 교체라 기존 것을 반드시 앞에 둔다 */
export function mergeSuggestedFixes(existing: Item["fixes"], added: Array<{ issue: string; solution: string }>): ToBeIssueFix[] {
  return [
    ...existing.map(({ asIsIssueId, issueTitle, solution, result }) => ({ asIsIssueId, issueTitle, solution, result })),
    ...added.map((f) => ({ asIsIssueId: null, issueTitle: f.issue, solution: f.solution, result: "OPEN" as const })),
  ];
}

export function SuggestPanel({ item, suggestion, busy, onApplyOverview, onAddFixes, onClose }: {
  item: Item;
  suggestion: ToBeSuggestion;
  busy: boolean;
  onApplyOverview: (input: ToBeItemInput) => Promise<boolean>;
  onAddFixes: (fixes: Array<{ issue: string; solution: string }>) => Promise<boolean>;
  onClose: () => void;
}) {
  const newSfr = suggestion.sfrCodes.filter((c) => !item.sfrCodes.includes(c));
  const rows: Array<{ field: Field; label: string; current: string; next: string; same: boolean }> = [
    { field: "changeType", label: "변화 유형", current: CHANGE_TYPE_CONFIG[item.changeType].label, next: CHANGE_TYPE_CONFIG[suggestion.changeType].label, same: item.changeType === suggestion.changeType },
    { field: "targetMethod", label: "목표 방식", current: TARGET_METHOD_CONFIG[item.targetMethod].label, next: TARGET_METHOD_CONFIG[suggestion.targetMethod].label, same: item.targetMethod === suggestion.targetMethod },
    { field: "priority", label: "우선순위", current: priorityText(item.priority), next: priorityText(suggestion.priority), same: item.priority === suggestion.priority },
    { field: "summary", label: "개선 요약", current: item.summary ?? "-", next: suggestion.summary, same: (item.summary ?? "") === suggestion.summary },
    { field: "sfrCodes", label: "연결 SFR (추가)", current: item.sfrCodes.join(", ") || "-", next: newSfr.length ? `+ ${newSfr.join(", ")}` : "추가할 코드 없음", same: newSfr.length === 0 },
  ];
  const [picked, setPicked] = useState<Set<Field>>(() => new Set(rows.filter((r) => !r.same).map((r) => r.field)));
  const [pickedFixes, setPickedFixes] = useState<Set<number>>(() => new Set(suggestion.fixes.map((_, i) => i)));
  const toggle = <T,>(set: Set<T>, v: T) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n; };

  // 적용 뒤 값이 같아진 칸은 체크가 남아 있어도 보내지 않는다
  const active = new Set([...picked].filter((f) => !rows.find((r) => r.field === f)!.same));
  const applyOverview = async () => {
    const input: ToBeItemInput = {};
    if (active.has("changeType")) input.changeType = suggestion.changeType;
    if (active.has("targetMethod")) input.targetMethod = suggestion.targetMethod;
    if (active.has("priority")) input.priority = suggestion.priority;
    if (active.has("summary")) input.summary = suggestion.summary;
    if (active.has("sfrCodes")) input.sfrCodes = [...item.sfrCodes, ...newSfr];
    if (await onApplyOverview(input)) setPicked(new Set());
  };
  const addFixes = async () => {
    if (await onAddFixes(suggestion.fixes.filter((_, i) => pickedFixes.has(i)))) setPickedFixes(new Set());
  };

  return (
    <section aria-label="AI 제안" className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-text dark:text-white"><Icon name="auto_awesome" size="sm" className="text-primary" />AI 제안</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            연결 AS-IS · 인터뷰 {suggestion.interviewCount}건 · 기능추적표 SFR 을 바탕으로 만든 초안입니다. 고른 항목만 저장됩니다.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="AI 제안 닫기" className="text-text-secondary hover:text-text dark:hover:text-white"><Icon name="close" size="sm" /></button>
      </header>

      {suggestion.reason && <p className="text-sm text-text dark:text-white"><span className="text-text-secondary">근거 · </span>{suggestion.reason}</p>}
      {suggestion.droppedSfr.length > 0 && (
        <p className="text-xs text-warning">기능추적표에 없는 코드는 뺐습니다: {suggestion.droppedSfr.join(", ")}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary">
              <th className="w-8 py-1" /><th className="w-28 py-1 font-medium">항목</th><th className="py-1 font-medium">현재</th><th className="py-1 font-medium">제안</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border-dark">
            {rows.map((r) => (
              <tr key={r.field} className="align-top">
                <td className="py-2"><input type="checkbox" aria-label={`${r.label} 적용`} checked={active.has(r.field)} disabled={r.same} onChange={() => setPicked(toggle(picked, r.field))} /></td>
                <td className="py-2 text-text-secondary">{r.label}</td>
                <td className="py-2 pr-3 whitespace-pre-wrap text-text-secondary">{r.current}</td>
                <td className={`py-2 whitespace-pre-wrap ${r.same ? "text-text-secondary" : "text-text dark:text-white font-medium"}`}>{r.same ? "같음" : r.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" leftIcon="check" onClick={applyOverview} disabled={busy || active.size === 0}>{busy ? "저장 중..." : `개요에 적용 (${active.size})`}</Button>
      </div>

      {suggestion.fixes.length > 0 && (
        <div className="space-y-2 border-t border-border dark:border-border-dark pt-3">
          <p className="text-xs font-medium text-text-secondary">개선 매핑 후보 (AS-IS 문제점 → 해결) · 기존 매핑 뒤에 "미해결"로 더합니다. 저장하지 않은 개선 매핑 편집은 사라집니다.</p>
          <ul className="space-y-1.5">
            {suggestion.fixes.map((f, i) => (
              <li key={i}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={pickedFixes.has(i)} onChange={() => setPickedFixes(toggle(pickedFixes, i))} aria-label={`${i + 1}번 개선 매핑 후보 선택`} />
                  <span className="min-w-0"><span className="text-text dark:text-white">{f.issue}</span><span className="text-text-secondary"> → {f.solution}</span></span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button variant="outline" leftIcon="playlist_add" disabled={busy || pickedFixes.size === 0}
              onClick={addFixes}>개선 매핑에 추가 ({pickedFixes.size})</Button>
          </div>
        </div>
      )}
    </section>
  );
}
