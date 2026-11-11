/**
 * @file src/app/dashboard/wbs/components/WbsActionBar.tsx
 * @description
 * WBS 트리 위에 항상 보이는 "선택 항목 작업" 버튼 줄입니다.
 * 행의 ⋮ 메뉴에 숨어 있던 기능(하위 추가 · 수정 · 레벨 올리기/내리기 · Task로 등록 · 삭제)을 버튼으로 보여 줍니다.
 *
 * 초보자 가이드:
 * 1. 행을 클릭해 선택하면 그 항목에 버튼이 적용된다. 선택이 없으면 모든 버튼이 꺼진 채로 보인다
 * 2. 그 항목에 해당하지 않는 버튼은 꺼지고, 마우스를 올리면 이유를 보여 준다 (예: 단위업무는 하위 추가 불가)
 * 3. 버튼이 부르는 동작은 행 메뉴와 같은 핸들러다 (삭제는 확인 창을 거친다)
 * 4. 폭은 패널 너비 기준(container query): 넓으면 선택 항목 이름까지, 보통 너비는 짧은 글자 버튼(올리기 · 내리기 · Task 등록),
 *    아주 좁으면 아이콘 버튼만. 전체 이름은 aria-label · 마우스 툴팁으로 항상 알 수 있다
 * 5. 높이는 오른쪽 간트의 줌 줄(h-8)과 같다 → 왼쪽 트리 행과 간트 행의 세로 위치가 맞는다. 높이를 바꾸면 GanttChart 줌 줄도 같이 바꾼다
 */

"use client";

import { Icon } from "@/components/ui";
import type { WbsItem, WbsLevel } from "@/lib/api";
import { levelColors, levelNames } from "../constants";

interface Props {
  item: WbsItem | null;
  onAddChild: (parentId: string, level: WbsLevel) => void;
  onEdit: (item: WbsItem) => void;
  onDelete: (id: string) => void;
  onLevelUp: (id: string) => void;
  onLevelDown: (id: string) => void;
  onRegisterTask: (item: WbsItem) => void;
}

const base = "h-6 shrink-0 inline-flex items-center gap-1 rounded-md border px-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";
const normal = `${base} border-border dark:border-border-dark bg-background-white dark:bg-surface-dark text-text dark:text-white enabled:hover:bg-surface dark:enabled:hover:bg-background-dark`;
const danger = `${base} border-error/40 bg-background-white dark:bg-surface-dark text-error enabled:hover:bg-error/10`;

function ActionButton({ icon, label, short, onClick, disabled, reason, tone = "normal", iconClass }: {
  icon: string; label: string; short?: string; onClick: () => void; disabled: boolean; reason?: string; tone?: "normal" | "danger"; iconClass?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={disabled ? reason : label} aria-label={label} className={tone === "danger" ? danger : normal}>
      <Icon name={icon} size="xs" className={disabled ? undefined : iconClass} />
      <span className="hidden @min-[28rem]:inline">{short ?? label}</span>
    </button>
  );
}

export function WbsActionBar({ item, onAddChild, onEdit, onDelete, onLevelUp, onLevelDown, onRegisterTask }: Props) {
  const none = !item;
  const level = item?.levelNumber ?? 0;
  const nextLevel = `LEVEL${level + 1}` as WbsLevel;
  const pick = "먼저 행을 클릭해 항목을 선택하세요";

  return (
    <div role="toolbar" aria-label="선택 항목 작업" className="@container h-8 shrink-0 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center gap-3 px-2 min-w-0">
      <div className="hidden @min-[48rem]:flex items-center gap-1.5 min-w-0 max-w-[40%] shrink">
        {item ? (
          <>
            <span className={`size-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold text-white ${levelColors[item.level]}`}>{levelNames[item.level]}</span>
            <span className="shrink-0 font-mono text-xs text-text-secondary">{item.code}</span>
            <span className="truncate text-sm font-medium text-text dark:text-white" title={item.name}>{item.name}</span>
          </>
        ) : (
          <span className="truncate text-xs text-text-secondary">행을 선택하면 작업 버튼이 켜집니다</span>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
        <div className="flex items-center gap-1 w-max ml-auto">
          <ActionButton icon="add" iconClass="text-primary" label={item && level < 4 ? `${levelNames[nextLevel]} 추가` : "하위 추가"}
            disabled={none || level >= 4} reason={none ? pick : "단위업무(4레벨) 아래에는 추가할 수 없습니다"}
            onClick={() => item && onAddChild(item.id, nextLevel)} />
          <ActionButton icon="edit" label="수정" disabled={none} reason={pick} onClick={() => item && onEdit(item)} />
          <span className="h-5 w-px bg-border dark:bg-border-dark shrink-0" aria-hidden />
          <ActionButton icon="arrow_upward" iconClass="text-blue-500" label="레벨 올리기" short="올리기" disabled={none || level <= 1}
            reason={none ? pick : "대분류(1레벨)는 더 올릴 수 없습니다"} onClick={() => item && onLevelUp(item.id)} />
          <ActionButton icon="arrow_downward" iconClass="text-orange-500" label="레벨 내리기" short="내리기" disabled={none || level >= 4}
            reason={none ? pick : "단위업무(4레벨)는 더 내릴 수 없습니다"} onClick={() => item && onLevelDown(item.id)} />
          <span className="h-5 w-px bg-border dark:bg-border-dark shrink-0" aria-hidden />
          <ActionButton icon="assignment" iconClass="text-primary" label="Task로 등록" short="Task 등록" disabled={none || level !== 4}
            reason={none ? pick : "단위업무(4레벨)만 Task로 등록할 수 있습니다"} onClick={() => item && onRegisterTask(item)} />
          <ActionButton icon="delete" label="삭제" tone="danger" disabled={none} reason={pick} onClick={() => item && onDelete(item.id)} />
        </div>
      </div>
    </div>
  );
}

/** 트리에서 id 로 항목 찾기 (선택 항목 → 버튼 줄) */
export function findWbsItem(items: WbsItem[], id: string | null): WbsItem | null {
  if (!id) return null;
  for (const it of items) {
    if (it.id === id) return it;
    const found = findWbsItem(it.children ?? [], id);
    if (found) return found;
  }
  return null;
}
