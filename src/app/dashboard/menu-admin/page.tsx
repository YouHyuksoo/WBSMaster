/**
 * @file src/app/dashboard/menu-admin/page.tsx
 * @description
 * 메뉴 관리 (HANES 메뉴 카테고리 관리 방식): 좌측 메뉴의 그룹 · 배치 · 순서를 화면에서 바꾼다. ADMIN 전용.
 *
 * 초보자 가이드:
 * 1. 왼쪽: 그룹 트리(끌어 놓아 순서 변경) + 미배치 메뉴
 * 2. 오른쪽: 선택한 그룹(이름 · 아이콘 · 사용 여부 · 삭제) 또는 메뉴(그룹 옮기기 · 미배치) 편집
 * 3. 바꾸면 바로 저장되고 좌측 메뉴가 다시 그려진다
 * 4. 화면 자체(이름 · 주소)는 src/lib/menu/menu-config.ts 에서 등록한다
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Icon, useToast } from "@/components/ui";
import { useInvalidateMenus, useMenuTree, useUnassignedMenus } from "@/hooks";
import { api } from "@/lib/api";
import { CategoryForm, MenuPanel, MenuTreePanel, UnassignedTray, type CategoryInput } from "./components";

type Selection = { kind: "none" } | { kind: "new" } | { kind: "category"; code: string } | { kind: "menu"; code: string };

export default function MenuAdminPage() {
  const toast = useToast();
  const invalidate = useInvalidateMenus();
  const { data: tree = [], isLoading } = useMenuTree();
  const { data: unassigned = [] } = useUnassignedMenus();
  const [selection, setSelection] = useState<Selection>({ kind: "none" });

  /** 모든 변경: 실행 → 메뉴 캐시 다시 불러오기 → 실패 시 서버 메시지 표시 */
  const run = useMutation({
    mutationFn: (task: () => Promise<unknown>) => task(),
    onSuccess: () => invalidate(),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
      invalidate();
    },
  });
  const busy = run.isPending;
  const selectedCategory = selection.kind === "category" ? tree.find((c) => c.code === selection.code) ?? null : null;
  const saveCategory = (input: CategoryInput) =>
    run.mutate(async () => {
      if (selection.kind === "new") {
        await api.menu.createCategory({ code: input.code, label: input.label, icon: input.icon || null, isActive: input.isActive });
        toast.success("그룹을 만들었습니다.");
        setSelection({ kind: "category", code: input.code });
      } else if (selectedCategory) {
        await api.menu.updateCategory(selectedCategory.code, { label: input.label, icon: input.icon || null, isActive: input.isActive });
        toast.success("그룹을 저장했습니다.");
      }
    });

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text dark:text-white flex items-center gap-2">
            <Icon name="menu_open" className="text-primary" />
            메뉴 관리
          </h1>
          <p className="text-sm text-text-secondary mt-1">좌측 메뉴의 그룹과 순서를 정합니다. 바꾸면 바로 저장됩니다.</p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={() => setSelection({ kind: "new" })}>그룹 추가</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-text-secondary">불러오는 중...</p>
          ) : (
            <MenuTreePanel
              tree={tree}
              selected={selection.kind === "category" ? `cat:${selection.code}` : selection.kind === "menu" ? `menu:${selection.code}` : null}
              onSelectCategory={(code) => setSelection({ kind: "category", code })}
              onSelectMenu={(code) => setSelection({ kind: "menu", code })}
              onReorderCategories={(items) => run.mutate(() => api.menu.reorderCategories(items))}
              onReorderItems={(code, items) => run.mutate(() => api.menu.reorderItems(code, items))}
            />
          )}
          <UnassignedTray codes={unassigned} tree={tree} busy={busy} onPlace={(menuCode, code) => run.mutate(() => api.menu.moveItem(menuCode, code))} />
        </div>

        <aside className="rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-4 lg:sticky lg:top-4">
          {selection.kind === "none" && <p className="text-sm text-text-secondary">왼쪽에서 그룹이나 메뉴를 고르거나, 그룹 추가를 누르세요.</p>}
          {selection.kind === "new" && <CategoryForm key="new" category={null} busy={busy} onSave={saveCategory} />}
          {selection.kind === "category" && selectedCategory && (
            <CategoryForm
              key={selectedCategory.code}
              category={selectedCategory}
              busy={busy}
              onSave={saveCategory}
              onDelete={() => run.mutate(async () => {
                await api.menu.deleteCategory(selectedCategory.code);
                toast.success("그룹을 지웠습니다.");
                setSelection({ kind: "none" });
              })}
            />
          )}
          {selection.kind === "menu" && (
            <MenuPanel key={selection.code} menuCode={selection.code} tree={tree} busy={busy}
              onMove={(to) => run.mutate(async () => {
                await api.menu.moveItem(selection.code, to);
                toast.success(to ? "그룹을 옮겼습니다." : "미배치로 내보냈습니다.");
              })} />
          )}
        </aside>
      </div>
    </div>
  );
}
