/**
 * @file src/app/dashboard/wbs/components/modals/WbsMoveModal.tsx
 * @description
 * WBS 항목을 어느 상위 항목 아래, 몇 번째 자리로 옮길지 고르는 창입니다. 옮기기 전에 결과(위치 · 레벨 · 번호)를 보여 줍니다.
 *
 * 초보자 가이드:
 * 1. **옮길 위치**: 상위 항목 목록에서 고른다. 못 가는 곳은 꺼진 채 이유가 보인다 (WbsMoveTargetList)
 * 2. **순서**: 그 상위 항목 안에서 맨 앞 · 어떤 항목 다음 · 맨 뒤
 * 3. **옮긴 뒤**: 저장과 같은 계산(planWbsMove)으로 미리 보여 준다. 제자리면 옮기기 버튼이 꺼진다
 * 4. 열 때마다 새로 그려야 하므로 부르는 쪽에서 key 를 준다
 */

"use client";

import { useMemo, useState } from "react";
import { Button, Icon, Modal } from "@/components/ui";
import type { WbsItem } from "@/lib/api";
import { planWbsMove, type MoveTarget } from "@/lib/wbs/move-plan";
import { levelColors, levelFullNames, levelNames } from "../../constants";
import { flattenWbs, pathLabel, wbsPath } from "../../utils/wbsPath";
import { WbsMoveTargetList } from "./WbsMoveTargetList";

interface WbsMoveModalProps {
  /** 전체 WBS 트리 (담당자 필터 전) */
  items: WbsItem[];
  /** 옮길 항목 */
  item: WbsItem;
  /** 미리 골라 둘 위치 */
  preset: MoveTarget;
  isSaving: boolean;
  onSubmit: (target: MoveTarget) => void;
  onClose: () => void;
}

const FIRST = "__first";
const LAST = "__last";
const toOption = (afterId: string | null | undefined) => (afterId === undefined ? LAST : afterId ?? FIRST);
const toAfterId = (option: string) => (option === LAST ? undefined : option === FIRST ? null : option);

export function WbsMoveModal({ items, item, preset, isSaving, onSubmit, onClose }: WbsMoveModalProps) {
  const nodes = useMemo(() => flattenWbs(items), [items]);
  const currentPath = useMemo(() => wbsPath(items, item.id).slice(0, -1), [items, item.id]);
  const currentParentId = currentPath.at(-1)?.id ?? null;

  const siblingsOf = (parentId: string | null) =>
    (parentId ? wbsPath(items, parentId).at(-1)?.children ?? [] : items).filter((s) => s.id !== item.id);
  /** 마지막 형제 다음 = 맨 뒤 */
  const normalize = (parentId: string | null, option: string) => (siblingsOf(parentId).at(-1)?.id === option ? LAST : option);

  const [parentId, setParentId] = useState<string | null>(preset.parentId);
  const [after, setAfter] = useState(() => normalize(preset.parentId, toOption(preset.afterId)));

  const siblings = siblingsOf(parentId);
  const target: MoveTarget = { parentId, afterId: toAfterId(after) };
  const plan = planWbsMove(nodes, item.id, target);
  const parent = parentId ? nodes.find((n) => n.id === parentId) ?? null : null;
  const unchanged = plan.ok && parentId === currentParentId && plan.item.code === item.code && plan.renumbered.length === 0;
  const losesOwnValues = parent && parentId !== currentParentId && (parent.children ?? []).length === 0 && (parent.progress > 0 || !!parent.startDate);

  const pickParent = (id: string | null) => {
    setParentId(id);
    setAfter(LAST);
  };

  return (
    <Modal isOpen onClose={onClose} title="WBS 항목 이동" size="xl" closeOnOverlayClick={!isSaving}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-background-dark px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <LevelBadge level={item.level} />
            <span className="shrink-0 font-mono text-xs text-text-secondary">{item.code}</span>
            <span className="truncate text-sm font-semibold text-text dark:text-white">{item.name}</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">지금 위치: {currentPath.length > 0 ? pathLabel(currentPath) : "최상위"}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <WbsMoveTargetList nodes={nodes} itemId={item.id} currentParentId={currentParentId} selected={parentId} onSelect={pickParent} />

        <div className="min-w-0 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text dark:text-white">순서</span>
          <select
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            className="w-full rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark px-3 py-2 text-sm text-text dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            <option value={LAST}>맨 뒤{siblings.length > 0 ? ` (${siblings.at(-1)!.code} ${siblings.at(-1)!.name} 다음)` : ""}</option>
            {siblings.length > 0 && <option value={FIRST}>맨 앞</option>}
            {siblings.slice(0, -1).map((s) => (
              <option key={s.id} value={s.id}>{s.code} {s.name} 다음</option>
            ))}
          </select>
        </label>

        <div aria-live="polite" className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          {!plan.ok ? (
            <p className="text-error">{plan.error}</p>
          ) : unchanged ? (
            <p className="text-text-secondary">지금과 같은 위치입니다. 옮길 위치나 순서를 고르세요.</p>
          ) : (
            <>
              <p className="text-xs text-text-secondary">옮긴 뒤</p>
              <p className="text-text dark:text-white">{parent ? pathLabel(wbsPath(items, parent.id)) : "최상위"} ›</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 min-w-0">
                <LevelBadge level={plan.item.level} />
                <span className="shrink-0 font-mono text-xs text-text-secondary">{plan.item.code}</span>
                <span className="min-w-0 font-semibold text-text dark:text-white">{item.name}</span>
                {plan.item.level !== item.level && (
                  <span className="shrink-0 text-xs text-text-secondary">{levelFullNames[item.level]} → {levelFullNames[plan.item.level]}</span>
                )}
              </p>
              {plan.descendantCount > 0 && <p className="mt-1 text-xs text-text-secondary">하위 {plan.descendantCount}개도 함께 옮겨집니다.</p>}
              {plan.renumbered.length > 0 && (
                <Notice>
                  다른 항목 {plan.renumberedTotal}개의 번호가 바뀝니다: {plan.renumbered.slice(0, 3).map((r) => `${r.from} → ${r.to}`).join(", ")}
                  {plan.renumberedTotal > Math.min(3, plan.renumbered.length) && ` 외 ${plan.renumberedTotal - Math.min(3, plan.renumbered.length)}개 (하위 포함)`}
                </Notice>
              )}
              {losesOwnValues && <Notice>&quot;{parent.name}&quot;의 진행률과 기간은 이제 하위 항목 기준으로 계산됩니다.</Notice>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>취소</Button>
          <Button variant="primary" leftIcon="drive_file_move" onClick={() => onSubmit(target)} disabled={!plan.ok || unchanged || isSaving} isLoading={isSaving}>
            여기로 이동
          </Button>
        </div>
        </div>
        </div>
      </div>
    </Modal>
  );
}

function LevelBadge({ level }: { level: WbsItem["level"] }) {
  return <span className={`size-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold text-white ${levelColors[level]}`}>{levelNames[level]}</span>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-warning">
      <Icon name="info" size="xs" className="shrink-0" />
      <span>{children}</span>
    </p>
  );
}
