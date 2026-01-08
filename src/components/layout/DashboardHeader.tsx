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

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts/ProjectContext";

/** 로컬 사용자 타입 */
interface LocalUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
}

interface DashboardHeaderProps {
  /** 모바일 메뉴 토글 핸들러 */
  onMenuToggle: () => void;
}

/**
 * 대시보드 헤더 컴포넌트
 */
export function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // 프로젝트 Context 사용
  const { selectedProjectId, setSelectedProjectId, selectedProject, projects, isLoading: isProjectsLoading } = useProject();

  // 사용자 정보 가져오기 (localStorage에서)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // 다크모드 초기화 (localStorage에서 저장된 테마 불러오기)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      // 저장된 테마가 없으면 시스템 설정 확인
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
        setIsDarkMode(true);
      } else {
        document.documentElement.classList.remove("dark");
        setIsDarkMode(false);
      }
    }
  }, []);

  // 프로필 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  // 프로젝트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };

    if (showProjectMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProjectMenu]);

  /**
   * 프로젝트 선택 핸들러
   */
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowProjectMenu(false);
  };

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // localStorage에서 user 삭제
      localStorage.removeItem("user");
      // 서버 쿠키 삭제
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      setIsLoggingOut(false);
      setShowProfileMenu(false);
    }
  };

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
  const userName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <header className="h-16 flex items-center justify-between whitespace-nowrap border-b border-border dark:border-border-dark bg-background-white dark:bg-background-dark px-6 z-[55] shrink-0">
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

        {/* 프로젝트 선택 드롭다운 */}
        <div className="relative ml-4 hidden md:block" ref={projectMenuRef}>
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark cursor-pointer hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors"
          >
            {/* 프로젝트 아이콘 */}
            <Icon name="folder" size="sm" className="text-primary" />
            {/* 선택된 프로젝트 이름 */}
            <span className="text-sm font-medium text-text dark:text-white max-w-[150px] truncate">
              {isProjectsLoading ? "로딩중..." : selectedProject?.name || "프로젝트 선택"}
            </span>
            <Icon
              name={showProjectMenu ? "expand_less" : "expand_more"}
              size="sm"
              className="text-text-secondary"
            />
          </button>

          {/* 프로젝트 드롭다운 메뉴 */}
          {showProjectMenu && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl shadow-lg py-2 z-[60] animate-slide-in-down">
              {/* 헤더 */}
              <div className="px-4 py-2 border-b border-border dark:border-border-dark">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  프로젝트 목록
                </p>
              </div>

              {/* 프로젝트 목록 */}
              <div className="max-h-64 overflow-y-auto py-1">
                {projects.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-text-secondary text-center">
                    프로젝트가 없습니다
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                        selectedProjectId === project.id
                          ? "bg-primary/10 text-primary"
                          : "text-text dark:text-white hover:bg-surface dark:hover:bg-background-dark"
                      }`}
                    >
                      {/* 선택 표시 */}
                      <Icon
                        name={selectedProjectId === project.id ? "check_circle" : "folder"}
                        size="sm"
                        className={selectedProjectId === project.id ? "text-primary" : "text-text-secondary"}
                      />
                      {/* 프로젝트 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-text-secondary truncate">{project.description}</p>
                        )}
                      </div>
                      {/* 상태 뱃지 */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        project.status === "ACTIVE"
                          ? "bg-success/20 text-success"
                          : project.status === "COMPLETED"
                          ? "bg-info/20 text-info"
                          : "bg-warning/20 text-warning"
                      }`}>
                        {project.status === "ACTIVE" ? "진행" : project.status === "COMPLETED" ? "완료" : "대기"}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* 새 프로젝트 링크 */}
              <div className="border-t border-border dark:border-border-dark pt-1 mt-1">
                <Link
                  href="/dashboard/projects"
                  onClick={() => setShowProjectMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon name="add_circle" size="sm" />
                  프로젝트 관리
                </Link>
              </div>
            </div>
          )}
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

        {/* 사용자 프로필 (드롭다운) */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 pl-2 pr-2 rounded-full hover:bg-surface dark:hover:bg-surface-dark transition-colors py-1 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-text dark:text-white leading-none">
                {userName}
              </p>
              <p className="text-xs text-success font-medium leading-none mt-1">
                Online
              </p>
            </div>
            {/* 아바타 */}
            <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center border-2 border-surface dark:border-surface-dark overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={userName}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <Icon
              name={showProfileMenu ? "expand_less" : "expand_more"}
              size="sm"
              className="text-text-secondary group-hover:text-text dark:group-hover:text-white transition-colors"
            />
          </button>

          {/* 프로필 드롭다운 메뉴 */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl shadow-lg py-2 z-50">
              {/* 사용자 정보 */}
              <div className="px-4 py-3 border-b border-border dark:border-border-dark">
                <p className="text-sm font-semibold text-text dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {user?.email || "이메일 없음"}
                </p>
              </div>

              {/* 메뉴 항목 */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-text dark:text-white hover:bg-surface dark:hover:bg-background-dark transition-colors"
                >
                  <Icon name="settings" size="sm" className="text-text-secondary" />
                  설정
                </Link>
                <Link
                  href="/dashboard/help"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-text dark:text-white hover:bg-surface dark:hover:bg-background-dark transition-colors"
                >
                  <Icon name="help" size="sm" className="text-text-secondary" />
                  도움말
                </Link>
              </div>

              {/* 로그아웃 */}
              <div className="border-t border-border dark:border-border-dark pt-1">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors w-full disabled:opacity-50"
                >
                  <Icon name="logout" size="sm" />
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
