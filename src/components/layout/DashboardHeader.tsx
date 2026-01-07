/**
 * @file src/components/layout/DashboardHeader.tsx
 * @description
 * 대시보드 상단 헤더 컴포넌트입니다.
 * 로고, 프로젝트 선택, 사용자 정보 등을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **프로젝트 선택**: 현재 프로젝트를 선택하는 드롭다운
 * 2. **다크모드 토글**: 라이트/다크 모드 전환
 * 3. **알림**: 새 알림 표시 (빨간 점)
 * 4. **사용자 프로필**: 현재 로그인한 사용자 정보
 *
 * 수정 방법:
 * - 헤더 높이 변경: h-16 클래스 수정
 * - 버튼 추가: flex gap-2 영역에 버튼 추가
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface DashboardHeaderProps {
  /** 모바일 메뉴 토글 핸들러 */
  onMenuToggle: () => void;
}

/**
 * 대시보드 헤더 컴포넌트
 */
export function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const supabase = createClient();

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  // 다크모드 초기화
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  /**
   * 다크모드 토글
   */
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // 사용자 이름 추출
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

  return (
    <header className="h-16 flex items-center justify-between whitespace-nowrap border-b border-border dark:border-border-dark bg-background-white dark:bg-background-dark px-6 z-20 shrink-0">
      {/* 좌측: 로고 및 프로젝트 선택 */}
      <div className="flex items-center gap-4">
        {/* 모바일 메뉴 버튼 */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
        >
          <Icon name="menu" size="md" className="text-text dark:text-white" />
        </button>

        {/* 로고 */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="size-8 flex items-center justify-center bg-primary rounded-lg text-white">
            <Icon name="account_tree" size="sm" />
          </div>
          <h2 className="text-text dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block">
            WBS Master
          </h2>
        </Link>

        {/* 프로젝트 선택 (추후 구현) */}
        <div className="ml-4 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark cursor-pointer hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors">
          <span className="text-sm font-medium text-text dark:text-white">
            프로젝트 선택
          </span>
          <Icon name="expand_more" size="sm" className="text-text-secondary" />
        </div>
      </div>

      {/* 우측: 액션 버튼 및 사용자 정보 */}
      <div className="flex flex-1 justify-end gap-4 items-center">
        {/* 버튼 그룹 */}
        <div className="flex gap-2">
          {/* 언어 전환 (추후 구현) */}
          <button className="hidden sm:flex h-9 items-center justify-center gap-1 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors px-3">
            <Icon name="language" size="sm" className="text-text dark:text-white" />
            <span className="text-xs font-bold text-text dark:text-white">KO</span>
          </button>

          {/* 다크모드 토글 */}
          <button
            onClick={toggleDarkMode}
            className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors"
            title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            <Icon
              name={isDarkMode ? "light_mode" : "dark_mode"}
              size="sm"
              className="text-text dark:text-white"
            />
          </button>

          {/* 알림 버튼 */}
          <button className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors relative">
            <Icon name="notifications" size="sm" className="text-text dark:text-white" />
            {/* 알림 표시 점 */}
            <span className="absolute top-2 right-2 size-2 bg-error rounded-full border border-background-white dark:border-surface-dark" />
          </button>
        </div>

        {/* 구분선 */}
        <div className="h-8 w-px bg-border dark:bg-border-dark mx-1" />

        {/* 사용자 프로필 */}
        <button className="flex items-center gap-3 pl-2 pr-2 rounded-full hover:bg-surface dark:hover:bg-surface-dark transition-colors py-1 group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-text dark:text-white leading-none">
              {userName}
            </p>
            <p className="text-xs text-success font-medium leading-none mt-1">
              Online
            </p>
          </div>
          {/* 아바타 */}
          <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center border-2 border-surface dark:border-surface-dark">
            <Icon name="person" size="sm" className="text-primary" />
          </div>
          <Icon
            name="expand_more"
            size="sm"
            className="text-text-secondary group-hover:text-text dark:group-hover:text-white transition-colors"
          />
        </button>
      </div>
    </header>
  );
}
