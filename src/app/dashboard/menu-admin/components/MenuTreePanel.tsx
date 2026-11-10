/**
 * @file src/app/dashboard/menu-admin/components/MenuTreePanel.tsx
 * @description 메뉴 그룹 + 그룹 안 메뉴 트리. 끌어 놓아 그룹 순서 · 그룹 안 메뉴 순서를 바꾼다 (dnd-kit).
 *
 * 초보자 가이드:
 * - 손잡이(⋮⋮)를 끌어 순서를 바꾸면 바로 저장한다 (10 단위 순서)
 * - 이름을 누르면 오른쪽 편집 패널에 그 그룹 · 메뉴가 열린다
 * - 키보드: 손잡이에 포커스 → Space 로 잡고 화살표로 옮긴 뒤 Space 로 놓는다
 * - 다른 그룹으로 옮기기 · 미배치로 내보내기는 오른쪽 메뉴 패널에서 한다
 */

"use client";

import type { ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui";
import type { MenuTreeCategory } from "@/lib/api";
import { ROOT_CATEGORY, findMenu } from "@/lib/menu/menu-config";

interface Props {
  tree: MenuTreeCategory[];
  selected: string | null;
  onSelectCategory: (code: string) => void;
  onSelectMenu: (menuCode: string) => void;
  onReorderCategories: (items: Array<{ code: string; sortOrder: number }>) => void;
  onReorderItems: (code: string, items: Array<{ menuCode: string; sortOrder: number }>) => void;
}

function SortableRow({ id, label, children, onClick, selected }: { id: string; label: string; children: ReactNode; onClick: () => void; selected: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="flex items-center gap-1">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`${label} 순서 옮기기`}
        className="cursor-grab px-1 text-text-secondary select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon name="drag_indicator" size="xs" />
      </button>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`flex flex-1 items-center gap-2 py-1.5 px-2 rounded-lg text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          selected ? "bg-primary/10 text-primary" : "text-text dark:text-white hover:bg-surface dark:hover:bg-surface-hover"
        }`}
      >
        {children}
      </button>
    </div>
  );
}

const step = <T,>(list: T[], key: (x: T) => string) => list.map((x, i) => ({ id: key(x), sortOrder: (i + 1) * 10 }));

export function MenuTreePanel({ tree, selected, onSelectCategory, onSelectMenu, onReorderCategories, onReorderItems }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const catIds = tree.map((c) => `cat:${c.code}`);

  const onCategoriesEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(tree, catIds.indexOf(String(active.id)), catIds.indexOf(String(over.id)));
    onReorderCategories(step(next, (c) => c.code).map((x) => ({ code: x.id, sortOrder: x.sortOrder })));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoriesEnd}>
      <SortableContext items={catIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tree.map((c) => {
            const itemIds = c.menus.map((m) => `menu:${m.menuCode}`);
            const onItemsEnd = ({ active, over }: DragEndEvent) => {
              if (!over || active.id === over.id) return;
              const next = arrayMove(c.menus, itemIds.indexOf(String(active.id)), itemIds.indexOf(String(over.id)));
              onReorderItems(c.code, step(next, (m) => m.menuCode).map((x) => ({ menuCode: x.id, sortOrder: x.sortOrder })));
            };
            const isRoot = c.code === ROOT_CATEGORY;
            return (
              <div key={c.code} className="rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-2">
                <SortableRow id={`cat:${c.code}`} label={c.label} onClick={() => onSelectCategory(c.code)} selected={selected === `cat:${c.code}`}>
                  <Icon name={isRoot ? "vertical_align_top" : c.icon || "folder"} size="sm" className="text-text-secondary" />
                  <span className="font-semibold">{isRoot ? "단독 메뉴 (맨 위)" : c.label}</span>
                  <span className="text-xs text-text-secondary">({c.code})</span>
                  {!c.isActive && <span className="ml-auto rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] text-text-secondary">사용 안 함</span>}
                </SortableRow>
                <div className="mt-1 ml-7 pl-3 border-l border-border dark:border-border-dark">
                  {c.menus.length === 0 ? (
                    <p className="py-1.5 text-xs text-text-secondary">메뉴가 없습니다. 미배치 메뉴에서 넣거나 다른 그룹에서 옮기세요.</p>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemsEnd}>
                      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        {c.menus.map((m) => {
                          const leaf = findMenu(m.menuCode);
                          return (
                            <SortableRow key={m.menuCode} id={`menu:${m.menuCode}`} label={leaf?.label ?? m.menuCode}
                              onClick={() => onSelectMenu(m.menuCode)} selected={selected === `menu:${m.menuCode}`}>
                              <Icon name={leaf?.icon ?? "help"} size="xs" className="text-text-secondary" />
                              <span>{leaf?.label ?? m.menuCode}</span>
                              <span className="text-xs text-text-secondary">({m.menuCode})</span>
                              {leaf?.systemOnly && <span className="ml-auto text-[10px] text-text-secondary">ADMIN 전용</span>}
                            </SortableRow>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
