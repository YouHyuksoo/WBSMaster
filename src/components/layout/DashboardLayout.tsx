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

import { ReactNode, useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardLayoutProps {
  /** 메인 콘텐츠 영역에 표시될 내용 */
  children: ReactNode;
}

/**
 * 대시보드 레이아웃 컴포넌트
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background dark:bg-background-dark">
      {/* 헤더 */}
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* 메인 영역 (사이드바 + 콘텐츠) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-auto bg-background dark:bg-background-dark">
          {children}
        </main>
      </div>
    </div>
  );
}
