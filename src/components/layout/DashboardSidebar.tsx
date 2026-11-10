/**
 * @file src/components/layout/DashboardSidebar.tsx
 * @description
 * 대시보드 좌측 사이드바 네비게이션 컴포넌트입니다.
 * 메뉴는 HANES 방식으로 그린다: 화면 목록은 src/lib/menu/menu-config.ts, 그룹 · 배치 · 순서는 DB(메뉴 관리 화면).
 *
 * 초보자 가이드:
 * 1. **메뉴 그룹**: '__ROOT__' 그룹의 메뉴는 맨 위에 바로, 나머지 그룹은 접고 펼치는 상위 메뉴(현재 화면이 들어 있으면 펼침)
 * 2. **권한**: 내 역할에 허용되지 않은 메뉴는 흐리게 보이고 누를 수 없다 (권한 관리 화면)
 * 3. **즐겨찾기**: 메뉴에 마우스를 올리면 별이 보이고, 누르면 헤더의 즐겨찾기 목록에 담긴다
 * 4. **isCollapsed**: 사이드바 축소 상태 (데스크탑 전용, 아이콘만)
 *
 * 수정 방법:
 * - 메뉴 추가: menu-config.ts 의 MENU_REGISTRY 에 등록 → 메뉴 관리 화면에서 그룹에 배치
 * - 메뉴 순서 · 그룹 변경: 시스템관리 > 메뉴 관리 (코드 수정 불필요)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { useCurrentUser, useMenuFavorites, useMenuTree, useMyMenuAccess } from "@/hooks";
import { menuForPath } from "@/lib/menu/menu-config";
import { buildSidebarGroups } from "@/lib/menu/menu-tree";
import { SidebarMenuRow, menuInteractionClassName } from "./SidebarMenuRow";

interface DashboardSidebarProps {
  /** 사이드바 열림 상태 (모바일용) */
  isOpen: boolean;
  /** 사이드바 닫기 핸들러 (모바일용) */
  onClose: () => void;
  /** 사이드바 축소 상태 (데스크탑용) */
  isCollapsed?: boolean;
  /** 사이드바 축소/확장 토글 핸들러 */
  onToggleCollapse?: () => void;
}

/**
 * 대시보드 사이드바 컴포넌트
 */
export function DashboardSidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const { data: tree } = useMenuTree();
  const { data: access } = useMyMenuAccess();
  const { favorites, toggle } = useMenuFavorites();

  const groups = useMemo(() => buildSidebarGroups(tree, access?.allowedMenus, isAdmin), [tree, access, isAdmin]);
  const activeCode = menuForPath(pathname)?.code;
  /** 현재 화면이 들어 있는 그룹 */
  const activeGroup = groups.find((g) => !g.isRoot && g.menus.some((m) => m.code === activeCode))?.code;

  /** 그룹 펼침 상태: 기본은 접힘, 현재 화면이 들어 있는 그룹은 펼침 */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => (activeGroup ? { [activeGroup]: true } : {}));

  // 다른 경로(헤더 링크 · 즐겨찾기 등)로 들어와도 현재 메뉴가 보이도록 펼친다
  useEffect(() => {
    if (activeGroup) setOpenGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${isCollapsed ? "lg:w-16" : "w-64"}
          bg-background-white dark:bg-surface
          border-r border-border dark:border-border-dark
          flex flex-col transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:flex
        `}
      >
        {/* 토글 버튼 (데스크탑 전용) */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-6 z-10 size-6 items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary-hover transition-colors"
          title={isCollapsed ? "사이드바 펴기" : "사이드바 접기"}
        >
          <Icon name={isCollapsed ? "chevron_right" : "chevron_left"} size="xs" />
        </button>

        {/* 메뉴 영역 */}
        <nav aria-label="주 메뉴" className="flex-1 overflow-y-auto p-4 flex flex-col gap-0.5">
          <p className={`px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ${isCollapsed ? "lg:hidden" : ""}`}>
            Menu
          </p>

          {groups.map((group, index) => {
            const rows = group.menus.map((menu) => (
              <SidebarMenuRow
                key={menu.code}
                menu={menu}
                active={menu.code === activeCode}
                collapsed={isCollapsed}
                favorite={favorites.includes(menu.code)}
                onToggleFavorite={toggle}
              />
            ));
            if (group.isRoot) return <div key={group.code} className="flex flex-col gap-0.5">{rows}</div>;

            const open = !!openGroups[group.code];
            const containsActive = group.code === activeGroup;
            const panelId = `sidebar-group-${group.code}`;
            return (
              <div key={group.code} className="flex flex-col gap-0.5">
                {/* 첫 그룹 앞(단독 메뉴 다음)에 구분선 */}
                {index > 0 && groups[index - 1].isRoot && (
                  <div className={`h-px bg-border dark:bg-border-dark my-2 ${isCollapsed ? "lg:mx-0" : "mx-2"}`} />
                )}
                {/* 그룹: 접고 펼치는 상위 메뉴 + 서브메뉴 */}
                <button
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.code]: !prev[group.code] }))}
                  aria-expanded={open}
                  aria-controls={panelId}
                  title={isCollapsed ? group.label : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors w-full text-left
                    ${isCollapsed ? "lg:justify-center lg:px-0" : ""}
                    ${containsActive && !open ? "text-primary" : "text-text dark:text-white"}
                    ${menuInteractionClassName}
                  `}
                >
                  <Icon name={group.icon || "folder"} size="sm" className={containsActive ? "text-primary" : "text-text-secondary"} />
                  <p className={`flex-1 text-sm font-bold ${isCollapsed ? "lg:hidden" : ""}`}>{group.label}</p>
                  <Icon
                    name="expand_more"
                    size="sm"
                    className={`text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""} ${isCollapsed ? "lg:hidden" : ""}`}
                  />
                </button>
                <div
                  id={panelId}
                  className={`${open ? "flex" : "hidden"} flex-col gap-0.5 ${isCollapsed ? "" : "ml-4 pl-2 border-l border-border dark:border-border-dark"}`}
                >
                  {rows}
                </div>
              </div>
            );
          })}
        </nav>

        {/* 하단 메뉴 */}
        <div className={`p-4 pt-0 flex flex-col gap-0.5 shrink-0 ${isCollapsed ? "lg:p-2 lg:pt-0" : ""}`}>
          <div className={`h-px bg-border dark:bg-border-dark my-2 ${isCollapsed ? "lg:mx-0" : ""}`} />

          {/* 도움말 */}
          <Link
            href="/dashboard/help"
            title={isCollapsed ? "도움말" : undefined}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-text dark:text-white ${menuInteractionClassName} transition-colors ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            <Icon name="help" size="sm" className="text-text-secondary" />
            <p className={`text-sm font-medium ${isCollapsed ? "lg:hidden" : ""}`}>도움말</p>
          </Link>
          {/* 로그아웃은 헤더 사용자 메뉴에만 둔다 (중복 제거) */}
        </div>
      </aside>
    </>
  );
}
