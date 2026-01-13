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
import { Icon, Button, Input, ImageCropper, useToast } from "@/components/ui";
import { useProject } from "@/contexts/ProjectContext";
import { TodayStatsScroller } from "@/components/dashboard/TodayStatsScroller";

/** 로컬 사용자 타입 */
interface LocalUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
}

/** 알림 타입 */
interface Notification {
  id: string;
  type: "TASK_ASSIGNED" | "MILESTONE_DUE_SOON" | "ISSUE_URGENT";
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  projectName?: string | null;
  createdAt: string;
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
  const toast = useToast();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  // 프로필 수정 모달 상태
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  // 이미지 크롭 모달 상태
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // 알림 상태
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

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

  // 알림 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    };

    if (showNotificationMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationMenu]);

  // 알림 조회 (앱 최초 시작 시 1회만)
  useEffect(() => {
    if (!user) return;

    // 이미 조회했는지 확인 (localStorage)
    const lastFetchTime = localStorage.getItem("notification_last_fetch");
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // 24시간 이내에 조회했으면 스킵
    if (lastFetchTime && now - parseInt(lastFetchTime) < ONE_DAY) {
      // 로컬스토리지에서 캐시된 알림 복원
      const cachedNotifications = localStorage.getItem("notifications_cache");
      const cachedUnreadCount = localStorage.getItem("notifications_unread_count");
      if (cachedNotifications) {
        try {
          setNotifications(JSON.parse(cachedNotifications));
          setUnreadCount(parseInt(cachedUnreadCount || "0"));
        } catch (e) {
          console.error("캐시 복원 실패:", e);
        }
      }
      return;
    }

    const fetchNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const response = await fetch("/api/notifications?checkMilestones=true");
        if (response.ok) {
          const data = await response.json();
          const notifs = data.notifications || [];
          const unread = data.unreadCount || 0;

          setNotifications(notifs);
          setUnreadCount(unread);

          // 로컬스토리지에 저장
          localStorage.setItem("notification_last_fetch", now.toString());
          localStorage.setItem("notifications_cache", JSON.stringify(notifs));
          localStorage.setItem("notifications_unread_count", unread.toString());
        }
      } catch (error) {
        console.error("알림 조회 실패:", error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [user]);

  /**
   * 알림 클릭 (읽음 처리 후 이동)
   */
  const handleNotificationClick = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
        const updatedNotifs = notifications.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        );
        setNotifications(updatedNotifs);
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);

        // 로컬스토리지 캐시 업데이트
        localStorage.setItem("notifications_cache", JSON.stringify(updatedNotifs));
        localStorage.setItem("notifications_unread_count", newUnreadCount.toString());
      } catch (error) {
        console.error("알림 읽음 처리 실패:", error);
      }
    }

    // 페이지 이동
    if (notification.link) {
      setShowNotificationMenu(false);
      router.push(notification.link);
    }
  };

  /**
   * 모든 알림 읽음 처리
   */
  const handleReadAllNotifications = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      const updatedNotifs = notifications.map((n) => ({ ...n, isRead: true }));
      setNotifications(updatedNotifs);
      setUnreadCount(0);

      // 로컬스토리지 캐시 업데이트
      localStorage.setItem("notifications_cache", JSON.stringify(updatedNotifs));
      localStorage.setItem("notifications_unread_count", "0");

      toast.success("모든 알림을 읽음 처리했습니다.");
    } catch (error) {
      console.error("모두 읽음 처리 실패:", error);
      toast.error("알림 처리에 실패했습니다.");
    }
  };

  /**
   * 알림 타입별 아이콘
   */
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return { icon: "assignment_ind", color: "text-primary" };
      case "MILESTONE_DUE_SOON":
        return { icon: "flag_circle", color: "text-warning" };
      case "ISSUE_URGENT":
        return { icon: "error", color: "text-error" };
      default:
        return { icon: "notifications", color: "text-text-secondary" };
    }
  };

  /**
   * 상대 시간 포맷
   */
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

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

  /**
   * 비밀번호 변경 모달 열기
   */
  const handleOpenPasswordModal = () => {
    setShowProfileMenu(false);
    setShowPasswordModal(true);
    setNewPassword("");
    setConfirmPassword("");
  };

  /**
   * 비밀번호 변경 처리
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    // 유효성 검사
    if (!newPassword.trim()) {
      toast.error("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setIsChangingPassword(true);

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "비밀번호 변경에 실패했습니다.");
      }

      toast.success("비밀번호가 변경되었습니다.");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.",
        "비밀번호 변경 실패"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * 프로필 수정 모달 열기
   */
  const handleOpenProfileModal = () => {
    setShowProfileMenu(false);
    setEditName(user?.name || "");
    setEditAvatar(user?.avatar || "");
    setShowProfileModal(true);
  };

  /**
   * 이미지 크롭 완료 후 업로드 처리
   */
  const handleImageCropComplete = async (blob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업로드 실패");
      }

      const { url } = await response.json();
      setEditAvatar(url);
      setShowImageCropper(false);
      toast.success("이미지가 업로드되었습니다.");
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      toast.error(
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
        "업로드 실패"
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  /**
   * 프로필 정보 수정 처리
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    // 유효성 검사
    if (!editName.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    try {
      setIsUpdatingProfile(true);

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          avatar: editAvatar.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "프로필 수정에 실패했습니다.");
      }

      const updatedUser = await response.json();

      // localStorage 업데이트
      const newUserData = { ...user, name: updatedUser.name, avatar: updatedUser.avatar };
      localStorage.setItem("user", JSON.stringify(newUserData));
      setUser(newUserData);

      toast.success("프로필이 수정되었습니다.");
      setShowProfileModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "프로필 수정에 실패했습니다.",
        "프로필 수정 실패"
      );
    } finally {
      setIsUpdatingProfile(false);
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

      {/* 중앙: 오늘 등록 통계 스크롤러 (데스크톱만 표시) */}
      <div className="hidden lg:block flex-1 max-w-xs mx-4">
        <TodayStatsScroller />
      </div>

      {/* 우측: 액션 버튼 및 사용자 정보 */}
      <div className="flex justify-end gap-4 items-center">
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

          {/* 알림 버튼 및 드롭다운 */}
          <div className="relative" ref={notificationMenuRef}>
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors relative"
            >
              <Icon name="notifications" size="sm" className="text-text dark:text-white" />
              {/* 읽지 않은 알림 표시 */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error rounded-full border-2 border-background-white dark:border-surface-dark text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 메뉴 */}
            {showNotificationMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl shadow-lg z-[60] animate-slide-in-down">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
                  <p className="text-sm font-bold text-text dark:text-white">알림</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleReadAllNotifications}
                      className="text-xs text-primary hover:underline"
                    >
                      모두 읽음
                    </button>
                  )}
                </div>

                {/* 알림 목록 */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-4 text-center">
                      <Icon name="progress_activity" size="md" className="text-text-secondary animate-spin mx-auto" />
                      <p className="text-xs text-text-secondary mt-2">알림을 불러오는 중...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Icon name="notifications_off" size="xl" className="text-text-secondary mb-2" />
                      <p className="text-sm text-text-secondary">새 알림이 없습니다</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => {
                      const iconConfig = getNotificationIcon(notification.type);
                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border dark:border-border-dark last:border-b-0 ${
                            notification.isRead
                              ? "bg-transparent hover:bg-surface dark:hover:bg-background-dark"
                              : "bg-primary/5 hover:bg-primary/10"
                          }`}
                        >
                          {/* 아이콘 */}
                          <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                            notification.isRead ? "bg-surface dark:bg-background-dark" : "bg-primary/10"
                          }`}>
                            <Icon name={iconConfig.icon} size="xs" className={iconConfig.color} />
                          </div>
                          {/* 내용 */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${
                              notification.isRead ? "text-text-secondary" : "text-text dark:text-white font-medium"
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-text-secondary mt-1">
                              {formatRelativeTime(notification.createdAt)}
                            </p>
                          </div>
                          {/* 읽지 않음 표시 */}
                          {!notification.isRead && (
                            <div className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* 푸터 */}
                {notifications.length > 10 && (
                  <div className="px-4 py-2 border-t border-border dark:border-border-dark text-center">
                    <p className="text-xs text-text-secondary">
                      최근 10개만 표시됩니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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
                <button
                  onClick={handleOpenProfileModal}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-text dark:text-white hover:bg-surface dark:hover:bg-background-dark transition-colors w-full text-left"
                >
                  <Icon name="edit" size="sm" className="text-text-secondary" />
                  정보 수정
                </button>
                <button
                  onClick={handleOpenPasswordModal}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-text dark:text-white hover:bg-surface dark:hover:bg-background-dark transition-colors w-full text-left"
                >
                  <Icon name="lock" size="sm" className="text-text-secondary" />
                  비밀번호 변경
                </button>
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

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">비밀번호 변경</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* 안내 메시지 */}
              <div className="p-3 bg-info/10 rounded-lg border border-info/20">
                <div className="flex items-start gap-2">
                  <Icon name="info" size="sm" className="text-info mt-0.5" />
                  <p className="text-xs text-text dark:text-white">
                    비밀번호는 최소 6자 이상이어야 합니다.
                  </p>
                </div>
              </div>

              <Input
                label="새 비밀번호 *"
                leftIcon="lock"
                type="password"
                placeholder="새 비밀번호 입력"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="비밀번호 확인 *"
                leftIcon="lock"
                type="password"
                placeholder="새 비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowPasswordModal(false)}
                  type="button"
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? "변경 중..." : "변경"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 프로필 수정 모달 */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">프로필 수정</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* 아바타 영역 */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-border dark:border-border-dark">
                <div className="relative group">
                  <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-surface dark:border-surface-dark overflow-hidden">
                    {editAvatar ? (
                      <img
                        src={editAvatar}
                        alt="아바타 미리보기"
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-3xl font-bold text-primary">
                        {(editName || user?.email?.split("@")[0] || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* 호버 시 카메라 아이콘 오버레이 */}
                  <button
                    type="button"
                    onClick={() => setShowImageCropper(true)}
                    disabled={isUploadingImage}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Icon name="add_a_photo" size="lg" className="text-white" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageCropper(true)}
                  disabled={isUploadingImage}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="edit" size="xs" />
                  {isUploadingImage ? "업로드 중..." : "사진 변경"}
                </button>
                {editAvatar && (
                  <button
                    type="button"
                    onClick={() => setEditAvatar("")}
                    className="text-xs text-error hover:underline"
                  >
                    사진 삭제
                  </button>
                )}
              </div>

              <Input
                label="이름 *"
                leftIcon="person"
                type="text"
                placeholder="표시될 이름 입력"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              {/* 안내 메시지 */}
              <div className="p-3 bg-info/10 rounded-lg border border-info/20">
                <div className="flex items-start gap-2">
                  <Icon name="info" size="sm" className="text-info mt-0.5" />
                  <p className="text-xs text-text dark:text-white">
                    이메일은 보안상의 이유로 변경할 수 없습니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowProfileModal(false)}
                  type="button"
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 이미지 크롭 모달 */}
      {showImageCropper && (
        <ImageCropper
          onCropComplete={handleImageCropComplete}
          onClose={() => setShowImageCropper(false)}
          onError={(message) => toast.error(message, "이미지 오류")}
          aspectRatio={1}
          cropShape="round"
        />
      )}
    </header>
  );
}
