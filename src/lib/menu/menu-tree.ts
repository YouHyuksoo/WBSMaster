/**
 * @file src/lib/menu/menu-tree.ts
 * @description
 * DB 트리(그룹 · 배치) + 코드 등록부(menu-config.ts) + 내 권한을 합쳐 좌측 메뉴용 그룹을 만듭니다 (HANES menuTreeStore 와 같은 규칙).
 *
 * 초보자 가이드:
 * 1. 비활성 그룹은 그룹째 빠진다. 등록부에 없는 코드는 버린다. 배치되지 않은 메뉴는 좌측 메뉴에 없다.
 * 2. 트리를 아직 못 받았으면(null) DEFAULT_MENU_LAYOUT 으로 그린다 (첫 화면 깜빡임 방지 · DB 장애 대비).
 * 3. 권한이 없는 메뉴는 숨기지 않고 disabled 로 표시한다 (HANES 와 같음). ADMIN 전용 메뉴는 ADMIN 이 아니면 숨긴다.
 * 4. canAccessMenu: allowed=null 이면 전부 허용(ADMIN).
 */

import { DEFAULT_MENU_LAYOUT, ROOT_CATEGORY, findMenu, type MenuLeaf } from "./menu-config";

export interface TreeInput {
  code: string;
  label: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  menus: Array<{ menuCode: string; sortOrder: number }>;
}

export interface SidebarMenu extends MenuLeaf {
  disabled: boolean;
}

export interface SidebarGroup {
  code: string;
  label: string;
  icon: string | null;
  isRoot: boolean;
  menus: SidebarMenu[];
}

export function canAccessMenu(code: string, allowed: string[] | null | undefined, isAdmin: boolean): boolean {
  const leaf = findMenu(code);
  if (!leaf) return false;
  if (isAdmin) return true;
  if (leaf.systemOnly) return false;
  if (allowed === undefined) return true; // 권한을 아직 못 받았으면 막지 않는다 (서버 API 가 최종 검사)
  return allowed === null || allowed.includes(code);
}

function defaultTree(): TreeInput[] {
  return DEFAULT_MENU_LAYOUT.map((c, i) => ({
    code: c.code, label: c.label, icon: c.icon, sortOrder: i * 10, isActive: true,
    menus: c.menus.map((m, j) => ({ menuCode: m, sortOrder: (j + 1) * 10 })),
  }));
}

export function buildSidebarGroups(tree: TreeInput[] | null | undefined, allowed: string[] | null | undefined, isAdmin: boolean): SidebarGroup[] {
  const source = tree && tree.length > 0 ? tree : defaultTree();
  return source
    .filter((c) => c.isActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      code: c.code,
      label: c.label,
      icon: c.icon,
      isRoot: c.code === ROOT_CATEGORY,
      menus: c.menus
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => findMenu(m.menuCode))
        .filter((leaf): leaf is MenuLeaf => !!leaf && (isAdmin || !leaf.systemOnly))
        .map((leaf) => ({ ...leaf, disabled: !canAccessMenu(leaf.code, allowed, isAdmin) })),
    }))
    .filter((g) => g.menus.length > 0);
}
