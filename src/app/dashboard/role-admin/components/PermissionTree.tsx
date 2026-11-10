/**
 * @file src/app/dashboard/role-admin/components/PermissionTree.tsx
 * @description 역할의 메뉴 접근 체크 트리 (HANES MenuPermissionTree 와 같은 동작).
 *
 * 초보자 가이드:
 * - 그룹 체크박스: 안의 메뉴를 모두 켜거나 끈다. 일부만 켜져 있으면 중간 상태(indeterminate)로 보인다
 * - ADMIN 전용 메뉴는 다른 역할에 줄 수 없어 꺼진 채 잠겨 있다
 * - readOnly(ADMIN 역할): 모두 켜진 채 잠긴다
 * - 그룹은 메뉴 관리의 배치를 따르고, 미배치 메뉴는 맨 아래 묶음으로 보인다
 */

"use client";

import { useEffect, useRef } from "react";
import { findMenu, type MenuLeaf } from "@/lib/menu/menu-config";

export interface PermissionGroup {
  code: string;
  label: string;
  menus: MenuLeaf[];
}

interface Props {
  groups: PermissionGroup[];
  checked: Set<string>;
  readOnly: boolean;
  onChange: (next: Set<string>) => void;
}

function GroupCheckbox({ label, state, disabled, onToggle }: { label: string; state: "all" | "some" | "none"; disabled: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-text dark:text-white">
      <input ref={ref} type="checkbox" checked={state === "all"} disabled={disabled} onChange={onToggle} aria-label={`${label} 전체`} />
      {label}
    </label>
  );
}

export function PermissionTree({ groups, checked, readOnly, onChange }: Props) {
  const grantable = (m: MenuLeaf) => !m.systemOnly;
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const options = g.menus.filter(grantable);
        const on = options.filter((m) => readOnly || checked.has(m.code)).length;
        const state = options.length > 0 && on === options.length ? "all" : on > 0 ? "some" : "none";
        return (
          <section key={g.code} className="rounded-xl border border-border dark:border-border-dark p-3">
            <GroupCheckbox
              label={g.label}
              state={readOnly ? "all" : state}
              disabled={readOnly || options.length === 0}
              onToggle={() => {
                const next = new Set(checked);
                options.forEach((m) => (state === "all" ? next.delete(m.code) : next.add(m.code)));
                onChange(next);
              }}
            />
            <ul className="mt-2 ml-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {g.menus.map((m) => {
                const locked = readOnly || !grantable(m);
                return (
                  <li key={m.code}>
                    <label className={`flex items-center gap-2 text-sm ${locked && !readOnly ? "text-text-secondary" : "text-text dark:text-white"}`}>
                      <input
                        type="checkbox"
                        checked={readOnly || (grantable(m) && checked.has(m.code))}
                        disabled={locked}
                        onChange={() => {
                          const next = new Set(checked);
                          if (next.has(m.code)) next.delete(m.code);
                          else next.add(m.code);
                          onChange(next);
                        }}
                      />
                      {m.label}
                      {m.systemOnly && <span className="text-[10px] text-text-secondary">ADMIN 전용</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** 메뉴 관리 배치(트리) 순서로 권한 그룹을 만들고, 배치되지 않은 메뉴는 "미배치 메뉴" 묶음으로 붙인다 */
export function buildPermissionGroups(
  tree: Array<{ code: string; label: string; menus: Array<{ menuCode: string }> }>,
  registry: readonly MenuLeaf[]
): PermissionGroup[] {
  const placed = new Set<string>();
  const groups = tree.map((c) => ({
    code: c.code,
    label: c.code === "__ROOT__" ? "단독 메뉴" : c.label,
    menus: c.menus.map((m) => findMenu(m.menuCode)).filter((m): m is MenuLeaf => !!m && (placed.add(m.code), true)),
  }));
  const rest = registry.filter((m) => !placed.has(m.code));
  return [...groups.filter((g) => g.menus.length > 0), ...(rest.length ? [{ code: "__UNASSIGNED__", label: "미배치 메뉴", menus: [...rest] }] : [])];
}
