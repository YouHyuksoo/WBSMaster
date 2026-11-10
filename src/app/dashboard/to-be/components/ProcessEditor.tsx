/**
 * @file src/app/dashboard/to-be/components/ProcessEditor.tsx
 * @description TO-BE 프로세스 정의: 단계마다 단계명 · 담당 · 시스템 · 입력 · 출력 · 비고를 표로 편집합니다.
 *
 * 초보자 가이드:
 * 1. 순서는 행 순서다. ↑ ↓ 로 바꾸고, 저장하면 1부터 다시 매긴다
 * 2. 단계명은 필수, 나머지는 비워도 된다
 * 3. 바꾼 뒤 "프로세스 저장"을 눌러야 저장된다 (목록 전체를 교체)
 */
"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import type { ToBeProcessStep } from "@/lib/api";

interface Props {
  initial: ToBeProcessStep[];
  saving: boolean;
  onSave: (steps: ToBeProcessStep[]) => void;
}

const cell = "w-full px-2 py-1.5 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white";
const COLS: Array<{ key: keyof ToBeProcessStep; label: string; width: string; placeholder: string }> = [
  { key: "name", label: "단계명 *", width: "w-[22%]", placeholder: "예: 절곡 실적 자동 수집" },
  { key: "owner", label: "담당", width: "w-[13%]", placeholder: "생산팀" },
  { key: "system", label: "시스템", width: "w-[13%]", placeholder: "MES · POP · 설비" },
  { key: "input", label: "입력", width: "w-[16%]", placeholder: "설비 TAG" },
  { key: "output", label: "출력", width: "w-[16%]", placeholder: "실적 · LOT" },
  { key: "remarks", label: "비고", width: "", placeholder: "" },
];

const strip = (rows: ToBeProcessStep[]) => rows.map(({ name, owner, system, input, output, remarks }) => ({ name, owner, system, input, output, remarks }));

export function ProcessEditor({ initial, saving, onSave }: Props) {
  const [rows, setRows] = useState<ToBeProcessStep[]>(strip(initial));
  const dirty = JSON.stringify(rows) !== JSON.stringify(strip(initial));
  const update = (i: number, key: keyof ToBeProcessStep, value: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRows(next);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border dark:border-border-dark p-6 text-center text-sm text-text-secondary">
          단계가 없습니다. TO-BE 업무가 어떤 순서로 진행되는지 단계를 추가하세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-xs text-text-secondary">
                <th className="w-10 py-1 text-left">순서</th>
                {COLS.map((c) => <th key={c.key} className={`${c.width} py-1 text-left`}>{c.label}</th>)}
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border dark:border-border-dark">
                  <td className="py-2 text-sm font-semibold tabular-nums text-text-secondary">{i + 1}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="py-2 pr-2">
                      <input className={cell} value={String(r[c.key] ?? "")} placeholder={c.placeholder} aria-label={`${i + 1}단계 ${c.label.replace(" *", "")}`}
                        onChange={(e) => update(i, c.key, e.target.value)} />
                    </td>
                  ))}
                  <td className="py-2">
                    <div className="flex items-center gap-0.5">
                      <button type="button" aria-label={`${i + 1}단계 위로`} disabled={i === 0} onClick={() => move(i, -1)} className="size-7 flex items-center justify-center rounded-md text-text-secondary hover:text-primary disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="arrow_upward" size="xs" /></button>
                      <button type="button" aria-label={`${i + 1}단계 아래로`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="size-7 flex items-center justify-center rounded-md text-text-secondary hover:text-primary disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-primary"><Icon name="arrow_downward" size="xs" /></button>
                      <button type="button" aria-label={`${i + 1}단계 삭제`} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="size-7 flex items-center justify-center rounded-md text-text-secondary hover:text-error focus-visible:ring-2 focus-visible:ring-primary"><Icon name="delete" size="xs" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" leftIcon="add" onClick={() => setRows([...rows, { name: "", owner: "", system: "", input: "", output: "", remarks: "" }])}>단계 추가</Button>
        <div className="flex gap-2">
          {dirty && <Button type="button" variant="ghost" onClick={() => setRows(strip(initial))} disabled={saving}>되돌리기</Button>}
          <Button type="button" variant="primary" onClick={() => onSave(rows)} disabled={!dirty || saving || rows.some((r) => !r.name.trim())}>{saving ? "저장 중..." : "프로세스 저장"}</Button>
        </div>
      </div>
    </div>
  );
}
