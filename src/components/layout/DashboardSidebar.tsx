/**
 * @file src/components/layout/DashboardSidebar.tsx
 * @description
 * 대시보드 좌측 사이드바 네비게이션 컴포넌트입니다.
 * 메뉴 항목과 관리 메뉴를 포함하며, 접기/펴기 기능을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **menuItems**: 주요 메뉴 항목 배열
 * 2. **managementItems**: 관리 메뉴 항목 배열
 * 3. **activeItem**: 현재 활성화된 메뉴 (URL 경로와 매칭)
 * 4. **isCollapsed**: 사이드바 축소 상태 (데스크탑 전용)
 * 5. **onToggleCollapse**: 사이드바 접기/펴기 토글 핸들러
 *
 * 수정 방법:
 * - 메뉴 추가: menuItems 또는 managementItems 배열에 항목 추가
 * - 아이콘 변경: icon 속성에 Material Symbols 이름 지정
 * - 축소 너비 변경: lg:w-16 클래스 수정
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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
  { label: "대시보드", icon: "dashboard", href: "/dashboard" },
  { label: "WBS 보기", icon: "account_tree", href: "/dashboard/wbs", filled: true },
  { label: "마일스톤", icon: "flag_circle", href: "/dashboard/milestones" },
  { label: "TASK 관리", icon: "view_kanban", href: "/dashboard/kanban" },
  { label: "일정 관리", icon: "event", href: "/dashboard/holidays" },
  { label: "기능추적표", icon: "fact_check", href: "/dashboard/process-verification" },
  { label: "요구사항 점검표", icon: "checklist", href: "/dashboard/requirements" },
  { label: "이슈사항 점검표", icon: "bug_report", href: "/dashboard/issues" },
  { label: "주간 업무보고", icon: "assignment", href: "/dashboard/weekly-report" },
  { label: "AI 어시스턴트", icon: "smart_toy", href: "/dashboard/chat", filled: true },
];

/** 관리 메뉴 항목 */
const managementItems: MenuItem[] = [
  { label: "기준 설정", icon: "tune", href: "/dashboard/settings" },
  { label: "유저 관리", icon: "manage_accounts", href: "/dashboard/users" },
  { label: "프로젝트 멤버", icon: "person_add", href: "/dashboard/members" },
  { label: "채팅 분석", icon: "analytics", href: "/dashboard/chat/history" },
  { label: "Slack 설정", icon: "forum", href: "/dashboard/slack" },
];

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
    // 대시보드는 정확히 매칭
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // 채팅은 정확히 매칭 (history와 구분)
    if (href === "/dashboard/chat") {
      return pathname === "/dashboard/chat";
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
          ${isCollapsed ? "lg:w-16" : "w-64"}
          bg-background-white dark:bg-background-dark
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
          <Icon
            name={isCollapsed ? "chevron_right" : "chevron_left"}
            size="xs"
          />
        </button>

        {/* 메뉴 영역 */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {/* 메뉴 섹션 */}
          <p className={`px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ${isCollapsed ? "lg:hidden" : ""}`}>
            Menu
          </p>

          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isCollapsed ? "lg:justify-center lg:px-0" : ""}
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
              <p className={`text-sm ${isActive(item.href) ? "font-bold" : "font-medium"} ${isCollapsed ? "lg:hidden" : ""}`}>
                {item.label}
              </p>
            </Link>
          ))}

          {/* 구분선 */}
          <div className={`h-px bg-border dark:bg-border-dark my-2 ${isCollapsed ? "lg:mx-0" : "mx-2"}`} />

          {/* 관리 섹션 */}
          <p className={`px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ${isCollapsed ? "lg:hidden" : ""}`}>
            Management
          </p>

          {managementItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isCollapsed ? "lg:justify-center lg:px-0" : ""}
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
              <p className={`text-sm ${isActive(item.href) ? "font-bold" : "font-medium"} ${isCollapsed ? "lg:hidden" : ""}`}>
                {item.label}
              </p>
            </Link>
          ))}
        </div>

        {/* 하단 메뉴 */}
        <div className={`p-4 pt-0 flex flex-col gap-2 shrink-0 ${isCollapsed ? "lg:p-2 lg:pt-0" : ""}`}>
          <div className={`h-px bg-border dark:bg-border-dark my-2 ${isCollapsed ? "lg:mx-0" : ""}`} />

          {/* 도움말 */}
          <Link
            href="/dashboard/help"
            title={isCollapsed ? "도움말" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark transition-colors ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            <Icon name="help" size="sm" className="text-text-secondary" />
            <p className={`text-sm font-medium ${isCollapsed ? "lg:hidden" : ""}`}>도움말</p>
          </Link>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "로그아웃" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark transition-colors w-full text-left ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            <Icon name="logout" size="sm" className="text-text-secondary group-hover:text-error" />
            <p className={`text-sm font-medium ${isCollapsed ? "lg:hidden" : ""}`}>로그아웃</p>
          </button>
        </div>
      </aside>
    </>
  );
}
