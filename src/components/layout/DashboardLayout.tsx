/**
 * @file src/components/layout/DashboardLayout.tsx
 * @description
 * 대시보드 전체 레이아웃 컴포넌트입니다.
 * Header, Sidebar, Main Content 영역을 포함합니다.
 *
 * 초보자 가이드:
 * 1. **children**: 메인 콘텐츠 영역에 표시될 내용
 * 2. **Sidebar**: 좌측 네비게이션 메뉴
 * 3. **Header**: 상단 헤더 (로고, 프로젝트 선택, 사용자 정보)
 *
 * 수정 방법:
 * - 레이아웃 비율 변경: w-64 (사이드바 너비), w-96 (AI 패널 너비)
 * - 반응형 조정: hidden lg:flex 등의 클래스 수정
 */

"use client";

import { ReactNode, useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { MenuAccessGuard } from "./MenuAccessGuard";
import { FloatingMenu } from "@/components/common/FloatingMenu";
import { checkSession } from "@/lib/session";

interface DashboardLayoutProps {
  /** 메인 콘텐츠 영역에 표시될 내용 */
  children: ReactNode;
}

/**
 * 대시보드 레이아웃 컴포넌트
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  /** 사이드바 축소 상태 (데스크탑용) */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /**
   * 로컬 스토리지에서 사이드바 축소 상태 복원
   */
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === "true");
    }
  }, []);

  /**
   * 세션 확인: 처음 열릴 때와 탭에 다시 돌아올 때 쿠키 세션이 살아 있는지 본다.
   * 쿠키가 만료되면 화면은 로그인 상태(localStorage)인데 API 만 401 이 되어
   * "인증이 필요합니다" · "불러오는 중" 멈춤이 생기므로 로그인 화면으로 보낸다.
   */
  useEffect(() => {
    checkSession();
    const onVisible = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /**
   * 사이드바 축소/확장 토글 핸들러
   */
  const handleToggleCollapse = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem("sidebarCollapsed", String(newCollapsed));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background dark:bg-background-dark">
      {/* 헤더 */}
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* 메인 영역 (사이드바 + 콘텐츠) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* 메인 콘텐츠 */}
        <main id="main-content" className="flex-1 overflow-auto bg-background dark:bg-background-dark">
          {/* 내 역할에 허용되지 않은 화면은 본문 대신 권한 없음 안내 */}
          <MenuAccessGuard>{children}</MenuAccessGuard>
        </main>
      </div>

      {/* 플로팅 메뉴 (오른쪽 하단) */}
      <FloatingMenu />
    </div>
  );
}
