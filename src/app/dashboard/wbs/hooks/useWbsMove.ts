/**
 * @file src/app/dashboard/wbs/hooks/useWbsMove.ts
 * @description
 * WBS 항목 이동 창의 열림 상태와 이동 실행을 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **open(id, kind)**: 이동 창을 연다. 올리기 · 내리기도 바로 옮기지 않고 위치만 미리 골라 둔 채 같은 창을 연다
 * 2. **presetTarget**: 올리기 = 지금 상위 항목 바로 다음, 내리기 = 바로 앞 형제의 맨 뒤, 이동 = 지금 위치
 * 3. **submit(target)**: 옮긴 뒤 새 위치까지 펼치고, 그 행을 선택해 화면 가운데로 보내고, 어디로 갔는지 알린다
 * 4. 담당자 필터와 관계없이 전체 트리(items)에서 위치를 고른다
 */

"use client";

import { useState } from "react";
import type { WbsItem } from "@/lib/api";
import type { useMoveWbsItem } from "@/hooks";
import type { MoveTarget } from "@/lib/wbs/move-plan";
import type { WbsMoveKind } from "../types";
import { levelFullNames } from "../constants";
import { pathLabel, wbsPath } from "../utils/wbsPath";

interface Params {
  items: WbsItem[];
  moveWbs: ReturnType<typeof useMoveWbsItem>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedItemId: (id: string | null) => void;
  toast: { success: (msg: string, title?: string) => void; error: (msg: string, title?: string) => void };
}

/** 창을 열 때 미리 골라 둘 위치 */
export function presetTarget(items: WbsItem[], id: string, kind: WbsMoveKind): MoveTarget {
  const path = wbsPath(items, id);
  const parent = path.at(-2) ?? null;
  const siblings = parent ? parent.children ?? [] : items;
  const at = siblings.findIndex((s) => s.id === id);
  const previous = at > 0 ? siblings[at - 1] : null;
  if (kind === "up" && parent) return { parentId: path.at(-3)?.id ?? null, afterId: parent.id };
  if (kind === "down" && previous) return { parentId: previous.id };
  return { parentId: parent?.id ?? null, afterId: previous?.id ?? null };
}

export function useWbsMove({ items, moveWbs, setExpandedIds, setSelectedItemId, toast }: Params) {
  const [moving, setMoving] = useState<{ id: string; kind: WbsMoveKind } | null>(null);
  const [movedCount, setMovedCount] = useState(0);

  const submit = async (target: MoveTarget) => {
    if (!moving) return;
    const name = wbsPath(items, moving.id).at(-1)?.name ?? "";
    const parentPath = wbsPath(items, target.parentId);
    try {
      const { item } = await moveWbs.mutateAsync({ id: moving.id, ...target });
      setExpandedIds((prev) => new Set([...prev, ...parentPath.map((p) => p.id)]));
      setSelectedItemId(moving.id);
      setMovedCount((c) => c + 1);
      setMoving(null);
      const where = parentPath.length > 0 ? `"${pathLabel(parentPath)}" 아래` : "최상위";
      toast.success(`"${name}" 항목을 ${where} ${item.code}(${levelFullNames[item.level]})(으)로 옮겼습니다.`, "항목 이동");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "항목을 옮기지 못했습니다.", "이동 실패");
    }
  };

  return {
    item: moving ? wbsPath(items, moving.id).at(-1) ?? null : null,
    preset: moving ? presetTarget(items, moving.id, moving.kind) : null,
    /** 옮길 때마다 늘어난다 (같은 행이 선택된 채여도 다시 스크롤하게) */
    movedCount,
    open: (id: string, kind: WbsMoveKind) => setMoving({ id, kind }),
    close: () => setMoving(null),
    submit,
  };
}
