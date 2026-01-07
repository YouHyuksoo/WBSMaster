/**
 * @file src/components/layout/DashboardSidebar.tsx
 * @description
 * 대시보드 좌측 사이드바 네비게이션 컴포넌트입니다.
 * 메뉴 항목과 관리 메뉴를 포함합니다.
 *
 * 초보자 가이드:
 * 1. **menuItems**: 주요 메뉴 항목 배열
 * 2. **managementItems**: 관리 메뉴 항목 배열
 * 3. **activeItem**: 현재 활성화된 메뉴 (URL 경로와 매칭)
 *
 * 수정 방법:
 * - 메뉴 추가: menuItems 또는 managementItems 배열에 항목 추가
 * - 아이콘 변경: icon 속성에 Material Symbols 이름 지정
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface DashboardSidebarProps {
  /** 사이드바 열림 상태 */
  isOpen: boolean;
  /** 사이드바 닫기 핸들러 */
  onClose: () => void;
}

/** 메뉴 항목 타입 */
interface MenuItem {
  /** 메뉴 라벨 */
  label: string;
  /** Material Symbols 아이콘 이름 */
  icon: string;
  /** 링크 경로 */
  href: string;
  /** 아이콘 채움 여부 (활성화 시) */
  filled?: boolean;
}

/** 주요 메뉴 항목 */
const menuItems: MenuItem[] = [
  { label: "DASHBOARD", icon: "dashboard", href: "/dashboard" },
  { label: "WBS 보기", icon: "account_tree", href: "/dashboard/wbs", filled: true },
  { label: "TASK KANBAN", icon: "view_kanban", href: "/dashboard/kanban" },
  { label: "요구사항 점검표", icon: "checklist", href: "/dashboard/requirements" },
];

/** 관리 메뉴 항목 */
const managementItems: MenuItem[] = [
  { label: "기준 설정", icon: "tune", href: "/dashboard/settings" },
  { label: "휴무 달력", icon: "calendar_month", href: "/dashboard/holidays" },
  { label: "프로젝트 멤버 등록", icon: "person_add", href: "/dashboard/members" },
  { label: "Slack 설정", icon: "forum", href: "/dashboard/slack" },
];

/**
 * 대시보드 사이드바 컴포넌트
 */
export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  /**
   * 로그아웃 핸들러
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  /**
   * 메뉴 항목이 활성화 상태인지 확인
   */
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-background-white dark:bg-background-dark
          border-r border-border dark:border-border-dark
          flex flex-col transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:flex
        `}
      >
        {/* 메뉴 영역 */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {/* 메뉴 섹션 */}
          <p className="px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
            Menu
          </p>

          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark"
                }
              `}
            >
              <Icon
                name={item.icon}
                size="sm"
                className={isActive(item.href) ? "text-primary" : "text-text-secondary"}
                style={isActive(item.href) && item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
              />
              <p className={`text-sm ${isActive(item.href) ? "font-bold" : "font-medium"}`}>
                {item.label}
              </p>
            </Link>
          ))}

          {/* 구분선 */}
          <div className="h-px bg-border dark:bg-border-dark my-2 mx-2" />

          {/* 관리 섹션 */}
          <p className="px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
            Management
          </p>

          {managementItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark"
                }
              `}
            >
              <Icon
                name={item.icon}
                size="sm"
                className={isActive(item.href) ? "text-primary" : "text-text-secondary"}
              />
              <p className={`text-sm ${isActive(item.href) ? "font-bold" : "font-medium"}`}>
                {item.label}
              </p>
            </Link>
          ))}
        </div>

        {/* 하단 메뉴 */}
        <div className="p-4 pt-0 flex flex-col gap-2 shrink-0">
          <div className="h-px bg-border dark:bg-border-dark my-2" />

          {/* 도움말 */}
          <Link
            href="/dashboard/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark transition-colors"
          >
            <Icon name="help" size="sm" className="text-text-secondary" />
            <p className="text-sm font-medium">도움말</p>
          </Link>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark transition-colors w-full text-left"
          >
            <Icon name="logout" size="sm" className="text-text-secondary group-hover:text-error" />
            <p className="text-sm font-medium">로그아웃</p>
          </button>
        </div>
      </aside>
    </>
  );
}
