/**
 * @file src/app/dashboard/menu-admin/components/MenuEditPanels.tsx
 * @description 메뉴 관리 오른쪽 편집 패널: 그룹 만들기 · 수정 · 삭제, 메뉴 그룹 이동 · 미배치, 미배치 메뉴 목록.
 *
 * 초보자 가이드:
 * - CategoryForm: 코드(만들 때만) · 이름 · 아이콘(Material Symbols 이름) · 사용 여부. '__ROOT__' 는 순서만 바꿀 수 있다
 * - MenuPanel: 메뉴 이름 · 코드 · 주소는 코드(menu-config.ts)에서만 바뀐다. 여기서는 소속 그룹만 바꾼다
 * - UnassignedTray: 어느 그룹에도 없는 메뉴. 그룹을 고르면 바로 그 그룹 맨 끝에 놓인다
 */

"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import type { MenuTreeCategory } from "@/lib/api";
import { ROOT_CATEGORY, findMenu } from "@/lib/menu/menu-config";

const inputClass = "w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white disabled:opacity-60";
const groupLabel = (c: MenuTreeCategory) => (c.code === ROOT_CATEGORY ? "단독 메뉴 (맨 위)" : c.label);

export interface CategoryInput {
  code: string;
  label: string;
  icon: string;
  isActive: boolean;
}

export function CategoryForm({ category, busy, onSave, onDelete }: {
  category: MenuTreeCategory | null; // null 이면 새 그룹
  busy: boolean;
  onSave: (input: CategoryInput) => void;
  onDelete?: () => void;
}) {
  const isRoot = category?.code === ROOT_CATEGORY;
  const [form, setForm] = useState<CategoryInput>({
    code: category?.code ?? "", label: category?.label ?? "", icon: category?.icon ?? "", isActive: category?.isActive ?? true,
  });
  const [confirm, setConfirm] = useState(false);

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <h2 className="text-base font-bold text-text dark:text-white">{category ? "그룹 수정" : "새 그룹"}</h2>
      {isRoot && <p className="text-xs text-text-secondary">단독 메뉴 묶음은 그룹 머리 없이 맨 위에 놓입니다. 이름 · 아이콘 · 사용 여부는 바꿀 수 없고 순서만 바꿀 수 있습니다.</p>}
      <label className="block">
        <span className="block text-xs font-medium text-text-secondary mb-1">그룹 코드 (영문 대문자 · 숫자 · _)</span>
        <input className={inputClass} value={form.code} disabled={!!category} required maxLength={50} placeholder="예: QUALITY"
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-text-secondary mb-1">이름</span>
        <input className={inputClass} value={form.label} disabled={isRoot} required maxLength={50} placeholder="예: 품질관리"
          onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-text-secondary mb-1">아이콘 (Material Symbols 이름)</span>
        <div className="flex items-center gap-2">
          <input className={inputClass} value={form.icon} disabled={isRoot} maxLength={50} placeholder="예: verified"
            onChange={(e) => setForm({ ...form, icon: e.target.value.trim().toLowerCase() })} />
          <span className="size-9 shrink-0 flex items-center justify-center rounded-lg bg-surface dark:bg-background-dark">
            <Icon name={form.icon || "folder"} size="sm" className="text-text-secondary" />
          </span>
        </div>
      </label>
      <label className="flex items-center gap-2 text-sm text-text dark:text-white">
        <input type="checkbox" checked={form.isActive} disabled={isRoot} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        좌측 메뉴에 표시 (끄면 그룹과 그 안의 메뉴가 숨겨집니다)
      </label>
      <div className="flex flex-wrap gap-2 pt-2">
        {!isRoot && <Button type="submit" variant="primary" disabled={busy}>{category ? "저장" : "그룹 만들기"}</Button>}
        {category && !isRoot && onDelete && (
          confirm ? (
            <>
              <Button type="button" variant="outline" onClick={() => { setConfirm(false); onDelete(); }} disabled={busy}>삭제 확인</Button>
              <Button type="button" variant="ghost" onClick={() => setConfirm(false)}>취소</Button>
            </>
          ) : (
            <Button type="button" variant="outline" leftIcon="delete" onClick={() => setConfirm(true)} disabled={category.menus.length > 0}
              title={category.menus.length > 0 ? "메뉴가 남아 있는 그룹은 지울 수 없습니다" : undefined}>
              그룹 삭제
            </Button>
          )
        )}
      </div>
      {category && !isRoot && category.menus.length > 0 && <p className="text-xs text-text-secondary">메뉴가 남아 있으면 지울 수 없습니다. 메뉴를 옮기거나 미배치로 내보내세요.</p>}
    </form>
  );
}

export function MenuPanel({ menuCode, tree, busy, onMove }: {
  menuCode: string;
  tree: MenuTreeCategory[];
  busy: boolean;
  onMove: (toCategoryCode: string | null) => void;
}) {
  const leaf = findMenu(menuCode);
  const current = tree.find((c) => c.menus.some((m) => m.menuCode === menuCode));
  const [target, setTarget] = useState(current?.code ?? "");
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-text dark:text-white">메뉴</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-secondary">이름</dt><dd className="text-text dark:text-white">{leaf?.label ?? menuCode}</dd>
        <dt className="text-text-secondary">코드</dt><dd className="text-text dark:text-white tabular-nums">{menuCode}</dd>
        <dt className="text-text-secondary">주소</dt><dd className="text-text dark:text-white break-all">{leaf?.href ?? "-"}</dd>
        <dt className="text-text-secondary">현재 그룹</dt><dd className="text-text dark:text-white">{current ? groupLabel(current) : "미배치"}</dd>
      </dl>
      <p className="text-xs text-text-secondary">이름 · 주소 · 아이콘은 코드(src/lib/menu/menu-config.ts)에서만 바꿀 수 있습니다.</p>
      <label className="block">
        <span className="block text-xs font-medium text-text-secondary mb-1">옮길 그룹</span>
        <select className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="" disabled>그룹 선택</option>
          {tree.map((c) => <option key={c.code} value={c.code}>{groupLabel(c)} ({c.code})</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" disabled={busy || !target || target === current?.code} onClick={() => onMove(target)}>그룹 옮기기</Button>
        {current && <Button type="button" variant="outline" disabled={busy} onClick={() => onMove(null)}>미배치로 내보내기</Button>}
      </div>
    </div>
  );
}

export function UnassignedTray({ codes, tree, busy, onPlace }: {
  codes: string[];
  tree: MenuTreeCategory[];
  busy: boolean;
  onPlace: (menuCode: string, categoryCode: string) => void;
}) {
  if (codes.length === 0) return null;
  return (
    <section className="rounded-xl border border-dashed border-border dark:border-border-dark p-3">
      <h3 className="text-sm font-semibold text-text dark:text-white mb-1">미배치 메뉴 ({codes.length})</h3>
      <p className="text-xs text-text-secondary mb-2">어느 그룹에도 없어서 좌측 메뉴에 보이지 않는 화면입니다. 그룹을 고르면 바로 놓입니다.</p>
      <ul className="space-y-1">
        {codes.map((code) => {
          const leaf = findMenu(code);
          return (
            <li key={code} className="flex items-center gap-2 px-2 py-1">
              <Icon name={leaf?.icon ?? "help"} size="xs" className="text-text-secondary" />
              <span className="flex-1 text-sm text-text dark:text-white">{leaf?.label ?? code} <span className="text-xs text-text-secondary">({code})</span></span>
              <select defaultValue="" disabled={busy} aria-label={`${leaf?.label ?? code} 놓을 그룹`}
                onChange={(e) => e.target.value && onPlace(code, e.target.value)}
                className="text-xs px-2 py-1 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-text dark:text-white">
                <option value="">그룹 선택</option>
                {tree.map((c) => <option key={c.code} value={c.code}>{groupLabel(c)}</option>)}
              </select>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
