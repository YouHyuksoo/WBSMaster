/**
 * @file src/app/dashboard/wbs/components/modals/WbsMoveTargetList.tsx
 * @description
 * WBS 이동 창에서 옮길 위치(상위 항목)를 고르는 목록입니다.
 *
 * 초보자 가이드:
 * 1. 최상위와 대 · 중 · 소분류만 보인다 (단위업무 아래에는 넣을 수 없다)
 * 2. 들여쓰기 · 레벨 배지 · 번호로 어느 단계인지 보이고, 오른쪽에 넣으면 무엇이 되는지(→ 소분류) 적는다
 * 3. 옮길 수 없는 곳은 꺼지고 짧은 이유가 보인다. 전체 이유는 마우스를 올리면 나온다 (checkWbsMove, 긴 글이 이름을 밀어내지 않게)
 * 4. 번호 · 이름으로 찾으면 맞는 항목만 남고, 같은 이름을 구분하도록 상위 이름을 작은 글자로 덧붙인다
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import type { WbsItem, WbsLevel } from "@/lib/api";
import { MOVE_INTO_SELF, checkWbsMove } from "@/lib/wbs/move-plan";
import { levelColors, levelFullNames, levelNames } from "../../constants";

interface Props {
  /** 트리 순서대로 편 전체 항목 */
  nodes: WbsItem[];
  itemId: string;
  currentParentId: string | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function WbsMoveTargetList({ nodes, itemId, currentParentId, selected, onSelect }: Props) {
  const [keyword, setKeyword] = useState("");
  const selectedRef = useRef<HTMLLabelElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: "center" });
  }, []);

  const rows = useMemo(() => {
    const names = new Map(nodes.map((n) => [n.id, n]));
    const parents = nodes.filter((n) => n.levelNumber < 4).map((n) => ({
      id: n.id as string | null,
      node: n as WbsItem | null,
      parentName: n.parentId ? names.get(n.parentId)?.name ?? "" : "",
      reason: checkWbsMove(nodes, itemId, n.id),
    }));
    return [{ id: null, node: null, parentName: "", reason: checkWbsMove(nodes, itemId, null) } as (typeof parents)[number], ...parents];
  }, [nodes, itemId]);

  const q = keyword.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.node && `${r.node.code} ${r.node.name}`.toLowerCase().includes(q)) : rows;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm font-medium text-text dark:text-white">옮길 위치 (이 항목 아래로 들어갑니다)</legend>
      <div className="relative mb-2">
        <Icon name="search" size="xs" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="번호나 이름으로 찾기"
          aria-label="옮길 위치 찾기"
          className="w-full rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark py-1.5 pl-8 pr-3 text-sm text-text dark:text-white placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>
      <div className="h-[45vh] min-h-40 overflow-y-auto rounded-lg border border-border dark:border-border-dark">
        {shown.length === 0 && <p className="p-4 text-center text-sm text-text-secondary">맞는 항목이 없습니다.</p>}
        {shown.map((r) => {
          const depth = r.node?.levelNumber ?? 0;
          const checked = selected === r.id;
          return (
            <label
              key={r.id ?? "root"}
              ref={checked ? selectedRef : undefined}
              className={`flex min-h-9 items-center gap-2 border-b border-border/60 dark:border-border-dark/60 pr-3 text-sm last:border-b-0 focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary ${
                checked ? "bg-primary/10" : ""
              } ${r.reason ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface dark:hover:bg-background-dark"}`}
              style={{ paddingLeft: `${12 + (q ? 0 : depth * 20)}px` }}
              title={r.reason ?? undefined}
            >
              <input type="radio" name="wbs-move-target" checked={checked} disabled={!!r.reason} onChange={() => onSelect(r.id)} className="size-4 shrink-0 accent-primary" />
              {r.node ? (
                <>
                  <span className={`size-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold text-white ${levelColors[r.node.level]}`}>{levelNames[r.node.level]}</span>
                  <span className="shrink-0 font-mono text-xs text-text-secondary">{r.node.code}</span>
                  <span className="truncate text-text dark:text-white">{r.node.name}</span>
                  {q && r.parentName && <span className="truncate text-xs text-text-secondary">{r.parentName}</span>}
                </>
              ) : (
                <span className="text-text dark:text-white">최상위</span>
              )}
              <span className="ml-auto shrink-0 whitespace-nowrap pl-2 text-xs text-text-secondary">
                {r.reason ? (r.reason === MOVE_INTO_SELF ? "옮기는 항목" : "4레벨 초과") : (r.id === currentParentId ? "지금 위치" : `→ ${levelFullNames[`LEVEL${depth + 1}` as WbsLevel]}`)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
