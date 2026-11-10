/**
 * @file src/app/dashboard/to-be/components/LinkChecklist.tsx
 * @description TO-BE 수정 창의 "여러 개 고르기" 목록 (연결 AS-IS · 연결 WBS 공용). 검색 + 체크박스.
 *
 * 초보자 가이드:
 * - options 의 code(번호)와 text(설명)로 검색한다
 * - 고른 id 목록은 부모가 들고 있다 (selected · onChange)
 * - indent 를 주면 그만큼 들여 써서 계층(WBS 레벨)을 보여 준다
 */
"use client";

import { useMemo, useState } from "react";

export interface LinkOption {
  id: string;
  code: string;
  text: string;
  indent?: number;
}

const label = "block text-xs font-medium text-text-secondary";

export function LinkChecklist({ title, searchLabel, emptyText, options, selected, onChange }: {
  title: string;
  searchLabel: string;
  emptyText: string;
  options: LinkOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || `${o.code} ${o.text}`.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={label}>{title} ({selected.length}건 선택)</span>
        <input className="w-48 px-2 py-1 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-xs text-text dark:text-white"
          placeholder={searchLabel} aria-label={searchLabel} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul className="max-h-40 overflow-y-auto rounded-lg border border-border dark:border-border-dark p-1">
        {filtered.length === 0 && <li className="px-2 py-2 text-xs text-text-secondary">{emptyText}</li>}
        {filtered.map((o) => (
          <li key={o.id}>
            <label className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface dark:hover:bg-surface-hover" style={o.indent ? { paddingLeft: 8 + o.indent * 16 } : undefined}>
              <input type="checkbox" checked={selected.includes(o.id)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o.id] : selected.filter((x) => x !== o.id))} />
              <span className="tabular-nums text-xs text-text-secondary w-16 shrink-0">{o.code}</span>
              <span className="truncate text-text dark:text-white">{o.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
