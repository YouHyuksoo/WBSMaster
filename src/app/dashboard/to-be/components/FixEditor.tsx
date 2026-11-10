/**
 * @file src/app/dashboard/to-be/components/FixEditor.tsx
 * @description 개선 매핑: AS-IS 문제점 → TO-BE 해결 방안 · 결과(해결 · 부분 · 미해결)를 표로 편집합니다.
 *
 * 초보자 가이드:
 * 1. "AS-IS 문제점에서 추가": 연결된 AS-IS 업무의 상세 분석 이슈 중 아직 매핑하지 않은 것을 골라 행을 만든다 (개선 제안이 있으면 해결 방안에 채움)
 * 2. "직접 추가": AS-IS 상세에 없는 문제점을 제목으로 적는다
 * 3. 바꾼 뒤 "개선 매핑 저장"을 눌러야 저장된다 (목록 전체를 교체)
 */
"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import type { ToBeDesign, ToBeIssueFix } from "@/lib/api";
import { FIX_RESULT_CONFIG } from "../types";

interface Props {
  initial: ToBeIssueFix[];
  candidates: ToBeDesign["issueCandidates"];
  saving: boolean;
  onSave: (fixes: ToBeIssueFix[]) => void;
}

const cell = "w-full px-2 py-1.5 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white";

export function FixEditor({ initial, candidates, saving, onSave }: Props) {
  const [rows, setRows] = useState<ToBeIssueFix[]>(initial);
  const [pick, setPick] = useState("");
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);
  const used = new Set(rows.map((r) => r.asIsIssueId).filter(Boolean));
  const free = candidates.filter((c) => !used.has(c.id));
  const update = (i: number, patch: Partial<ToBeIssueFix>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addFromCandidate = () => {
    const c = candidates.find((x) => x.id === pick);
    if (!c) return;
    setRows([...rows, { asIsIssueId: c.id, issueTitle: c.title, solution: c.suggestedFix ?? "", result: "OPEN" }]);
    setPick("");
  };
  const counts = { RESOLVED: 0, PARTIAL: 0, OPEN: 0 } as Record<ToBeIssueFix["result"], number>;
  rows.forEach((r) => (counts[r.result] += 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${cell} w-auto min-w-64`} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="AS-IS 문제점 고르기" disabled={free.length === 0}>
          <option value="">{free.length ? `AS-IS 문제점 고르기 (${free.length}건)` : "고를 AS-IS 문제점이 없습니다"}</option>
          {free.map((c) => <option key={c.id} value={c.id}>[{c.asIsLabel}] {c.title}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" leftIcon="add_link" onClick={addFromCandidate} disabled={!pick}>AS-IS 문제점에서 추가</Button>
        <Button type="button" variant="ghost" size="sm" leftIcon="add" onClick={() => setRows([...rows, { asIsIssueId: null, issueTitle: "", solution: "", result: "OPEN" }])}>직접 추가</Button>
        <span className="ml-auto text-xs text-text-secondary tabular-nums">
          해결 {counts.RESOLVED} · 부분 {counts.PARTIAL} · 미해결 {counts.OPEN}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border dark:border-border-dark p-6 text-center text-sm text-text-secondary">
          아직 매핑이 없습니다. 이 업무가 해결하는 AS-IS 문제점을 추가하세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-xs text-text-secondary">
                <th className="w-8 py-1 text-left">#</th>
                <th className="py-1 text-left">AS-IS 문제점</th>
                <th className="py-1 text-left">TO-BE 해결 방안</th>
                <th className="w-32 py-1 text-left">결과</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="align-top border-t border-border dark:border-border-dark">
                  <td className="py-2 text-xs text-text-secondary tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <input className={cell} value={r.issueTitle} placeholder="문제점" aria-label={`${i + 1}번 문제점`} maxLength={300}
                      onChange={(e) => update(i, { issueTitle: e.target.value })} />
                    {r.asIsIssueId && <p className="mt-1 text-[11px] text-text-secondary"><Icon name="link" size="xs" /> AS-IS 상세 이슈와 연결</p>}
                  </td>
                  <td className="py-2 pr-2">
                    <textarea className={`${cell} field-sizing-content min-h-9 max-h-40`} value={r.solution} placeholder="해결 방안" aria-label={`${i + 1}번 해결 방안`} maxLength={2000}
                      onChange={(e) => update(i, { solution: e.target.value })} />
                  </td>
                  <td className="py-2 pr-2">
                    <select className={`${cell} ${FIX_RESULT_CONFIG[r.result].className}`} value={r.result} aria-label={`${i + 1}번 결과`}
                      onChange={(e) => update(i, { result: e.target.value as ToBeIssueFix["result"] })}>
                      {Object.entries(FIX_RESULT_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="py-2">
                    <button type="button" aria-label={`${i + 1}번 매핑 삭제`} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="size-8 flex items-center justify-center rounded-md text-text-secondary hover:text-error hover:bg-error/10 focus-visible:ring-2 focus-visible:ring-primary">
                      <Icon name="delete" size="xs" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {dirty && <Button type="button" variant="ghost" onClick={() => setRows(initial)} disabled={saving}>되돌리기</Button>}
        <Button type="button" variant="primary" onClick={() => onSave(rows)} disabled={!dirty || saving}>{saving ? "저장 중..." : "개선 매핑 저장"}</Button>
      </div>
    </div>
  );
}
