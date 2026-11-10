/**
 * @file src/components/layout/SidebarMenuRow.tsx
 * @description
 * 좌측 메뉴 한 줄: 메뉴 링크 + 즐겨찾기 별 버튼. 권한이 없으면 흐리게 보이고 누를 수 없다.
 *
 * 초보자 가이드:
 * 1. 별은 마우스를 올리거나 키보드로 포커스하면 보이고, 즐겨찾기면 항상 채워진 노란 별로 보인다
 * 2. 링크와 별 버튼은 형제 요소다 (a 안에 button 을 넣지 않는다)
 * 3. 축소된 사이드바에서는 아이콘만 보이고 별은 숨긴다
 */

"use client";

import Link from "next/link";
import { Icon } from "@/components/ui";
import type { SidebarMenu } from "@/lib/menu/menu-tree";

/** 일반 메뉴·그룹 버튼·하단 메뉴가 공유하는 호버 및 키보드 포커스 표시 */
export const menuInteractionClassName = "hover:bg-surface dark:hover:bg-surface-hover focus-visible:bg-surface dark:focus-visible:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset";

interface SidebarMenuRowProps {
  menu: SidebarMenu;
  active: boolean;
  collapsed: boolean;
  favorite: boolean;
  onToggleFavorite?: (code: string) => void;
}

export function SidebarMenuRow({ menu, active, collapsed, favorite, onToggleFavorite }: SidebarMenuRowProps) {
  const body = (
    <>
      <Icon
        name={menu.icon}
        size="sm"
        className={active ? "text-primary" : "text-text-secondary"}
        style={active && menu.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      />
      <p className={`flex-1 truncate text-sm ${active ? "font-bold" : "font-medium"} ${collapsed ? "lg:hidden" : ""}`}>{menu.label}</p>
    </>
  );
  const rowClass = `flex min-w-0 flex-1 items-center gap-3 px-3 py-1.5 rounded-lg transition-colors ${collapsed ? "lg:justify-center lg:px-0" : ""}`;

  return (
    <div className="group/menu relative flex items-center">
      {menu.disabled ? (
        <span
          aria-disabled="true"
          title={`${menu.label} — 권한이 없는 메뉴입니다`}
          className={`${rowClass} text-text dark:text-white opacity-40 cursor-not-allowed`}
        >
          {body}
        </span>
      ) : (
        <Link
          href={menu.href}
          title={collapsed ? menu.label : undefined}
          aria-current={active ? "page" : undefined}
          className={`${rowClass} ${active ? "bg-primary/10 text-primary border border-primary/20" : `text-text dark:text-white ${menuInteractionClassName}`}`}
        >
          {body}
        </Link>
      )}
      {onToggleFavorite && !menu.disabled && (
        <button
          type="button"
          onClick={() => onToggleFavorite(menu.code)}
          aria-label={favorite ? `${menu.label} 즐겨찾기 해제` : `${menu.label} 즐겨찾기 추가`}
          aria-pressed={favorite}
          title={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          className={`absolute right-1 size-6 items-center justify-center rounded-md hover:bg-surface dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            collapsed
              ? "hidden"
              : favorite
                ? "flex"
                : // display:none 이면 Tab 으로 갈 수 없으므로 투명 + 클릭 막기로 숨긴다 (키보드 포커스 · 마우스 올림 때 보임)
                  "flex opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto group-focus-within/menu:opacity-100 focus-visible:opacity-100 focus-visible:pointer-events-auto"
          }`}
        >
          <Icon
            name="star"
            size="xs"
            className={favorite ? "text-amber-500" : "text-text-secondary"}
            style={favorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
          />
        </button>
      )}
    </div>
  );
}
