/**
 * @file src/app/dashboard/page.tsx
 * @description
 * 대시보드 메인 페이지입니다.
 * 프로젝트 목록, 통계, 담당자별 진행률 등을 표시합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **통계 카드**: 전체 프로젝트, 진행중, 완료됨 등의 통계
 * 2. **프로젝트 목록**: 참여중인 프로젝트 목록
 * 3. **담당자별 진행률**: 각 담당자의 작업 완료율 그래프
 * 4. **작업 현황**: 대기중/진행중/완료 작업 비율
 *
 * 수정 방법:
 * - 통계 추가: StatCard 컴포넌트 복사하여 추가
 * - 프로젝트 카드 수정: ProjectCard 내용 변경
 */

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Button, Card, Input, useToast, ConfirmModal } from "@/components/ui";
import { useProjects, useTasks, useCreateProject, useUpdateProject, useDeleteProject, useWbsStats, useIssueStats, useRequirementStats, useTodaySchedules, useIssues, useRequirements } from "@/hooks";
import { useProject } from "@/contexts/ProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/lib/api";
import { DailyTaskChart } from "@/components/dashboard/DailyTaskChart";
import { AssigneeTaskChart } from "@/components/dashboard/AssigneeTaskChart";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";

// 분리된 대시보드 컴포넌트들 (React.memo 적용)
import {
  ProjectCard,
  TodayScheduleSection,
  WbsStatsSection,
  TaskStatsSection,
  IssueStatsSection,
  RequirementStatsSection,
  type ProjectWithWbs,
  type OrgMember,
} from "./components";

/** 로컬 사용자 타입 */
interface LocalUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
}

/**
 * 대시보드 메인 페이지 - 인터랙티브 버전
 */
export default function DashboardPage() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuickScheduleModal, setShowQuickScheduleModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithWbs | null>(null);
  const [overviewProject, setOverviewProject] = useState<ProjectWithWbs | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  /** 프로젝트 상태 필터 */
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  /** 검색어 */
  const [searchQuery, setSearchQuery] = useState("");
  /** MY 대시보드 필터 (내 데이터만 보기) */
  const [isMyDashboard, setIsMyDashboard] = useState(false);
  /** 새로고침 중 상태 */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
    status: "PLANNING",
    startDate: "",
    endDate: "",
  });
  /** 빠른 일정 추가용 상태 */
  const [quickSchedule, setQuickSchedule] = useState({
    title: "",
    type: "MEETING",
    isAllDay: true,
    startTime: "",
    endTime: "",
  });
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  /** 프로젝트 캐러셀 관련 상태 */
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /** 프로젝트 목록 조회 */
  const { data: projects = [], isLoading: projectsLoading } = useProjects() as { data: ProjectWithWbs[]; isLoading: boolean; };

  /** 태스크 목록 조회 (전체) */
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  /** WBS 단위업무 기반 담당자별 통계 */
  const { data: wbsStats, isLoading: wbsStatsLoading } = useWbsStats();

  /** 이슈 통계 (카테고리별, 해결/미해결) */
  const { data: issueStats, isLoading: issueStatsLoading } = useIssueStats();

  /** 요구사항 통계 (담당자별 처리 현황) */
  const { data: reqStats, isLoading: reqStatsLoading } = useRequirementStats();

  /** 이슈 목록 조회 (MY 대시보드 필터용) */
  const { data: issues = [] } = useIssues();

  /** 요구사항 목록 조회 (MY 대시보드 필터용) */
  const { data: requirements = [] } = useRequirements();

  /** 현재 선택된 프로젝트 */
  const { selectedProjectId } = useProject();

  // 일정 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const scheduleFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
    }),
    [selectedProjectId]
  );

  /** 오늘의 일정 조회 (전체 인원) */
  const { data: todaySchedules = [], isLoading: schedulesLoading } = useTodaySchedules(scheduleFilters);

  /** 프로젝트 생성 */
  const createProject = useCreateProject();

  /** 프로젝트 수정 */
  const updateProject = useUpdateProject();

  /** 프로젝트 삭제 */
  const deleteProject = useDeleteProject();

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

  // 사용자 이름 추출
  const userName = user?.name || user?.email?.split("@")[0] || "사용자";

  /**
   * MY 대시보드 필터 적용된 프로젝트 목록
   * - 내가 소유한 프로젝트
   * - 내가 팀 멤버로 참여한 프로젝트
   */
  const myProjects = isMyDashboard && user
    ? projects.filter((p) => {
        // 내가 소유한 프로젝트
        if (p.ownerId === user.id) return true;
        // 내가 팀 멤버인 프로젝트
        if (p.teamMembers?.some((tm: { userId?: string }) => tm.userId === user.id)) return true;
        return false;
      })
    : projects;

  /**
   * MY 대시보드 필터 적용된 태스크 목록
   * - 내가 담당자인 태스크
   * - 내가 생성한 태스크
   */
  const myTasks = isMyDashboard && user
    ? tasks.filter((t) => {
        // 내가 주 담당자
        if (t.assigneeId === user.id || t.assignee?.id === user.id) return true;
        // 내가 부 담당자
        if (t.assignees?.some((a: { id?: string; userId?: string }) => a.id === user.id || a.userId === user.id)) return true;
        // 내가 생성한 태스크
        if (t.creatorId === user.id) return true;
        return false;
      })
    : tasks;

  /**
   * 내가 담당자인 태스크만 (TASK 현황용)
   * - 생성자 여부와 관계없이 내가 담당자인 것만
   */
  const myAssignedTasks = isMyDashboard && user
    ? tasks.filter((t) => {
        // 내가 주 담당자
        if (t.assigneeId === user.id || t.assignee?.id === user.id) return true;
        // 내가 부 담당자
        if (t.assignees?.some((a: { id?: string; userId?: string }) => a.id === user.id || a.userId === user.id)) return true;
        return false;
      })
    : tasks;

  /**
   * MY 대시보드용 이슈 필터링
   * - 내가 보고자이거나 담당자인 이슈만
   */
  const myIssues = isMyDashboard && user
    ? issues.filter((issue) => {
        // 내가 보고자
        if (issue.reporterId === user.id) return true;
        // 내가 담당자
        if (issue.assigneeId === user.id) return true;
        return false;
      })
    : issues;

  /**
   * MY 대시보드용 요구사항 필터링
   * - 내가 요청자이거나 담당자인 요구사항만
   */
  const myRequirements = isMyDashboard && user
    ? requirements.filter((req) => {
        // 내가 요청자
        if (req.requesterId === user.id) return true;
        // 내가 담당자
        if (req.assigneeId === user.id) return true;
        return false;
      })
    : requirements;

  // 통계 계산 (MY 대시보드 필터 적용)
  const stats = {
    totalProjects: myProjects.length,
    activeProjects: myProjects.filter((p) => p.status === "ACTIVE").length,
    completedProjects: myProjects.filter((p) => p.status === "COMPLETED").length,
    totalTasks: myTasks.length,
    completedTasks: myTasks.filter((t) => t.status === "COMPLETED").length,
    pendingTasks: myTasks.filter((t) => t.status === "PENDING").length,
  };

  /** 필터링된 프로젝트 목록 */
  const filteredProjects = myProjects.filter((p) => {
    // 상태 필터
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  /**
   * 정렬된 프로젝트 목록 (진행중 프로젝트 우선)
   * - ACTIVE 상태가 제일 먼저
   * - 그 다음 PLANNING
   * - 나머지는 기존 순서 유지
   */
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      ACTIVE: 0,
      PLANNING: 1,
      ON_HOLD: 2,
      COMPLETED: 3,
      CANCELLED: 4,
    };
    return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
  });

  /**
   * 캐러셀 스크롤 상태 업데이트
   */
  const updateScrollButtons = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  /**
   * 캐러셀 자동 스크롤 시작 (호버 시)
   */
  const startAutoScroll = useCallback((direction: "left" | "right") => {
    // 기존 인터벌 정리
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }

    // 즉시 한번 스크롤
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -8 : 8;
      carouselRef.current.scrollBy({ left: scrollAmount });
    }

    // 연속 스크롤 시작
    scrollIntervalRef.current = setInterval(() => {
      if (carouselRef.current) {
        const scrollAmount = direction === "left" ? -8 : 8;
        carouselRef.current.scrollBy({ left: scrollAmount });
      }
    }, 16); // 60fps
  }, []);

  /**
   * 캐러셀 자동 스크롤 정지 (호버 해제 시)
   */
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // 캐러셀 스크롤 상태 감지
  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      updateScrollButtons();
      carousel.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);

      return () => {
        carousel.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [updateScrollButtons, sortedProjects]);

  /**
   * 전체 데이터 새로고침
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["wbs-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["issue-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["requirement-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["today-schedules"] }),
      ]);
      toast.success("데이터가 새로고침되었습니다.");
    } catch (error) {
      toast.error("새로고침에 실패했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * 빠른 일정 추가 핸들러
   */
  const handleQuickScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSchedule.title.trim()) return;

    // 프로젝트 선택 확인
    if (!selectedProjectId) {
      toast.error("프로젝트를 먼저 선택해주세요.");
      return;
    }

    // 로그인 확인
    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    try {
      // 오늘 날짜로 일정 생성
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickSchedule.title,
          type: quickSchedule.type,
          startDate: today,
          endDate: today,
          isAllDay: quickSchedule.isAllDay,
          startTime: quickSchedule.isAllDay ? null : quickSchedule.startTime,
          endTime: quickSchedule.isAllDay ? null : quickSchedule.endTime,
          projectId: selectedProjectId,
          userId: user.id, // 로그인한 사용자를 등록자로 설정
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "일정 생성 실패");
      }

      toast.success("일정이 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["today-schedules"] });
      setQuickSchedule({ title: "", type: "MEETING", isAllDay: true, startTime: "", endTime: "" });
      setShowQuickScheduleModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "일정 추가에 실패했습니다.");
    }
  };

  /**
   * 프로젝트 생성 핸들러
   */
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    try {
      await createProject.mutateAsync({
        name: newProject.name,
        description: newProject.description,
        startDate: newProject.startDate || undefined,
        endDate: newProject.endDate || undefined,
      });
      toast.success("프로젝트가 생성되었습니다.");
      setNewProject({ name: "", description: "", startDate: "", endDate: "" });
      setShowCreateModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "프로젝트 생성에 실패했습니다.",
        "생성 실패"
      );
    }
  };

  /**
   * 프로젝트 편집 모달 열기
   */
  const handleOpenEditModal = (project: ProjectWithWbs, e: React.MouseEvent) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation();
    setEditingProject(project);
    setEditProject({
      name: project.name,
      description: project.description || "",
      status: project.status,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
    });
    setShowEditModal(true);
  };

  /**
   * 프로젝트 개요 모달 열기
   */
  const handleOpenOverviewModal = (project: ProjectWithWbs, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOverviewProject(project);
    setShowOverviewModal(true);
  };

  /**
   * 프로젝트 개요 저장
   */
  const handleSaveOverview = async (data: {
    purpose?: string | null;
    organizationChart?: OrgMember[] | null;
    successIndicators?: string[];
    futureVision?: string | null;
    visionImage?: string | null;
  }) => {
    if (!overviewProject) return;

    try {
      const response = await fetch(`/api/projects/${overviewProject.id}/overview`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("개요 저장 실패");

      toast.success("프로젝트 개요가 저장되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // 개요 프로젝트 업데이트
      setOverviewProject({
        ...overviewProject,
        ...data,
      });
    } catch (error) {
      toast.error("개요 저장에 실패했습니다.");
      throw error;
    }
  };

  /**
   * 프로젝트 수정 핸들러
   */
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProject.name.trim()) return;

    try {
      await updateProject.mutateAsync({
        id: editingProject.id,
        data: {
          name: editProject.name,
          description: editProject.description || undefined,
          status: editProject.status as Project["status"],
          startDate: editProject.startDate || undefined,
          endDate: editProject.endDate || undefined,
        },
      });
      toast.success("프로젝트가 수정되었습니다.");
      setShowEditModal(false);
      setEditingProject(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "프로젝트 수정에 실패했습니다.",
        "수정 실패"
      );
    }
  };

  /**
   * 프로젝트 삭제 핸들러
   */
  const handleDeleteProject = () => {
    setShowDeleteConfirm(true);
  };

  /**
   * 프로젝트 삭제 확인
   */
  const handleConfirmDeleteProject = async () => {
    if (!editingProject) return;

    try {
      await deleteProject.mutateAsync(editingProject.id);
      toast.success("프로젝트가 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setShowEditModal(false);
      setEditingProject(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "프로젝트 삭제에 실패했습니다.",
        "삭제 실패"
      );
    }
  };

  /** 로딩 상태 */
  if (projectsLoading || tasksLoading || wbsStatsLoading || issueStatsLoading || reqStatsLoading || schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /**
   * 일정 유형별 스타일 설정
   */
  const scheduleTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
    COMPANY_HOLIDAY: { label: "회사 휴일", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400", icon: "event_busy" },
    TEAM_OFFSITE: { label: "팀 외근", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", icon: "groups" },
    PERSONAL_LEAVE: { label: "개인 휴가", color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", icon: "beach_access" },
    PERSONAL_SCHEDULE: { label: "개인 일정", color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", icon: "person" },
    MEETING: { label: "회의", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "videocam" },
    DEADLINE: { label: "마감", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", icon: "flag" },
    OTHER: { label: "기타", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: "event" },
  };

  /**
   * 오늘 날짜 포맷
   */
  const today = new Date();
  const todayFormatted = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="p-6 space-y-6">
      {/* 헤더: 환영 메시지 + 퀵 액션 */}
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-background-white dark:bg-surface-dark border rounded-xl p-4 animate-fadeIn transition-all ${
        isMyDashboard ? "border-primary/50 ring-1 ring-primary/20" : "border-border dark:border-border-dark"
      }`}>
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text dark:text-white">
                {isMyDashboard ? `${userName}님의 대시보드` : `안녕하세요, ${userName}님!`}
              </h1>
              {isMyDashboard && (
                <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded-full animate-pulse">
                  MY
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary">
              {isMyDashboard
                ? "나에게 할당된 프로젝트와 작업만 표시됩니다."
                : "오늘도 프로젝트를 효율적으로 관리해보세요."}
            </p>
          </div>
        </div>

        {/* 컴팩트 통계 - 클릭 가능 */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer group"
          >
            <Icon name="folder" size="sm" className="text-primary group-hover:scale-110 transition-transform" />
            <div className="text-xs">
              <span className="text-text-secondary">프로젝트</span>
              <span className="font-bold text-text dark:text-white ml-1">{stats.totalProjects}</span>
            </div>
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group ${
              statusFilter === "ACTIVE" ? "bg-success/30 ring-2 ring-success" : "bg-success/10 hover:bg-success/20"
            }`}
          >
            <Icon name="trending_up" size="sm" className="text-success group-hover:scale-110 transition-transform" />
            <div className="text-xs">
              <span className="text-text-secondary">진행중</span>
              <span className="font-bold text-success ml-1">{stats.activeProjects}</span>
            </div>
          </button>
          <button
            onClick={() => setStatusFilter("COMPLETED")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group ${
              statusFilter === "COMPLETED" ? "bg-slate-200 dark:bg-slate-700 ring-2 ring-slate-400" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Icon name="check_circle" size="sm" className="text-slate-500 group-hover:scale-110 transition-transform" />
            <div className="text-xs">
              <span className="text-text-secondary">완료</span>
              <span className="font-bold text-slate-600 dark:text-slate-300 ml-1">{stats.completedProjects}</span>
            </div>
          </button>
          <button
            onClick={() => router.push("/dashboard/kanban")}
            className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors cursor-pointer group"
          >
            <Icon name="task_alt" size="sm" className="text-warning group-hover:scale-110 transition-transform" />
            <div className="text-xs">
              <span className="text-text-secondary">작업</span>
              <span className="font-bold text-text dark:text-white ml-1">{stats.totalTasks}</span>
              <span className="text-amber-500 ml-1">(+{stats.pendingTasks})</span>
            </div>
          </button>

          {/* 퀵 액션 버튼 그룹 */}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border dark:border-border-dark">
            {/* 새로고침 버튼 */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all ${
                isRefreshing ? "animate-spin" : ""
              }`}
              title="데이터 새로고침"
            >
              <Icon name="refresh" size="sm" />
            </button>
            {/* 빠른 일정 추가 */}
            <button
              onClick={() => setShowQuickScheduleModal(true)}
              className="p-2 rounded-lg text-text-secondary hover:text-sky-500 hover:bg-sky-500/10 transition-all"
              title="빠른 일정 추가"
            >
              <Icon name="event" size="sm" />
            </button>
            {/* MY 대시보드 토글 */}
            <Button
              variant={isMyDashboard ? "primary" : "ghost"}
              size="sm"
              leftIcon="person"
              onClick={() => setIsMyDashboard(!isMyDashboard)}
              className={isMyDashboard ? "ring-2 ring-primary/50" : ""}
            >
              MY
            </Button>
            {/* 새 프로젝트 */}
            <Button variant="primary" size="sm" leftIcon="add" onClick={() => setShowCreateModal(true)}>
              새 프로젝트
            </Button>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text dark:text-white">내 프로젝트</h2>
            {/* 필터 상태 표시 및 리셋 */}
            {(statusFilter !== "ALL" || searchQuery) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary">
                  {filteredProjects.length}개 표시 중
                </span>
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-primary hover:text-primary-hover flex items-center gap-1"
                >
                  <Icon name="close" size="xs" />
                  필터 초기화
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 검색 바 */}
            <div className="relative">
              <Icon
                name="search"
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="프로젝트 검색..."
                className="pl-9 pr-4 py-2 w-48 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                >
                  <Icon name="close" size="xs" />
                </button>
              )}
            </div>

            {/* 상태 필터 드롭다운 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="ALL">모든 상태</option>
              <option value="PLANNING">계획</option>
              <option value="ACTIVE">진행중</option>
              <option value="ON_HOLD">보류</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
            </select>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center animate-fadeIn">
            <Icon name="folder_open" size="xl" className="text-text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
              프로젝트가 없습니다
            </h3>
            <p className="text-text-secondary mb-4">
              새 프로젝트를 생성하여 작업을 시작해보세요.
            </p>
            <Button variant="primary" leftIcon="add" onClick={() => setShowCreateModal(true)}>
              프로젝트 생성
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center animate-fadeIn">
            <Icon name="search_off" size="xl" className="text-text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-text-secondary mb-4">
              다른 검색어나 필터를 시도해보세요.
            </p>
            <Button
              variant="ghost"
              leftIcon="refresh"
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
            >
              필터 초기화
            </Button>
          </div>
        ) : (
          /* 캐러셀 형식 프로젝트 목록 */
          <div className="relative flex items-center gap-2">
            {/* 왼쪽 스크롤 버튼 - 항상 표시, 호버 시 자동 스크롤 */}
            <button
              onMouseEnter={() => canScrollLeft && startAutoScroll("left")}
              onMouseLeave={stopAutoScroll}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                canScrollLeft
                  ? "bg-primary/10 text-primary hover:bg-primary hover:text-white hover:scale-110 hover:shadow-lg cursor-pointer"
                  : "bg-surface dark:bg-surface-dark text-text-secondary/30 cursor-not-allowed"
              }`}
            >
              <Icon name="chevron_left" size="lg" />
            </button>

            {/* 캐러셀 컨테이너 */}
            <div
              ref={carouselRef}
              className="flex-1 flex gap-4 overflow-x-hidden pb-2"
            >
              {sortedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex-shrink-0"
                  style={{ width: "calc((100% - 32px) / 3)" }}
                >
                  <ProjectCard
                    project={project}
                    onEdit={handleOpenEditModal}
                    onOverview={handleOpenOverviewModal}
                    animationDelay={index * 100}
                  />
                </div>
              ))}
            </div>

            {/* 오른쪽 스크롤 버튼 - 항상 표시, 호버 시 자동 스크롤 */}
            <button
              onMouseEnter={() => canScrollRight && startAutoScroll("right")}
              onMouseLeave={stopAutoScroll}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                canScrollRight
                  ? "bg-primary/10 text-primary hover:bg-primary hover:text-white hover:scale-110 hover:shadow-lg cursor-pointer"
                  : "bg-surface dark:bg-surface-dark text-text-secondary/30 cursor-not-allowed"
              }`}
            >
              <Icon name="chevron_right" size="lg" />
            </button>
          </div>
        )}

        {/* 프로젝트 수 표시 및 전체 보기 링크 */}
        {sortedProjects.length > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              총 {sortedProjects.length}개 프로젝트
              {sortedProjects.filter((p) => p.status === "ACTIVE").length > 0 && (
                <span className="ml-2 text-success">
                  • 진행중 {sortedProjects.filter((p) => p.status === "ACTIVE").length}개
                </span>
              )}
            </span>
            <Link
              href="/dashboard/projects"
              className="text-primary hover:text-primary-hover font-medium flex items-center gap-1"
            >
              전체 보기
              <Icon name="arrow_forward" size="xs" />
            </Link>
          </div>
        )}
      </div>

      {/* 현황 대시보드 - 왼쪽 일정 + 오른쪽 2x2 통계 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 왼쪽: 오늘의 일정 */}
        <TodayScheduleSection schedules={todaySchedules} todayFormatted={todayFormatted} />

        {/* 오른쪽: 2x2 통계 그리드 */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 담당자별 진행률 (WBS 기준) */}
          <WbsStatsSection wbsStats={wbsStats} />

          {/* TASK 현황 - 담당자별 */}
          <TaskStatsSection tasks={myAssignedTasks} />

          {/* 이슈 현황 */}
          <IssueStatsSection issueStats={issueStats} issues={myIssues} isMyDashboard={isMyDashboard} />

          {/* 요구사항 현황 */}
          <RequirementStatsSection reqStats={reqStats} requirements={myRequirements} isMyDashboard={isMyDashboard} user={user} />
        </div>
      </div>

      {/* 작업 부하 차트 섹션 - 2개 나란히 배치 */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 일자별 작업 부하 차트 */}
        <DailyTaskChart projectId={selectedProjectId || projects?.[0]?.id || ""} />

        {/* 담당자별 작업 현황 차트 */}
        <AssigneeTaskChart projectId={selectedProjectId || projects?.[0]?.id || ""} />
      </div>

      {/* 프로젝트 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark">
              <h2 className="text-lg font-bold text-text dark:text-white">
                새 프로젝트 생성
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  프로젝트 이름 *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="프로젝트 이름을 입력하세요"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="프로젝트 설명을 입력하세요"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text resize-none h-20 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowCreateModal(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={createProject.isPending}
                >
                  {createProject.isPending ? "생성 중..." : "생성"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 프로젝트 수정 모달 */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark">
              <h2 className="text-lg font-bold text-text dark:text-white">
                프로젝트 수정
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>
            <form onSubmit={handleUpdateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  프로젝트 이름 *
                </label>
                <input
                  type="text"
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                  placeholder="프로젝트 이름을 입력하세요"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                  placeholder="프로젝트 설명을 입력하세요"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text resize-none h-20 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  상태
                </label>
                <select
                  value={editProject.status}
                  onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="PLANNING">계획</option>
                  <option value="ACTIVE">진행중</option>
                  <option value="ON_HOLD">보류</option>
                  <option value="COMPLETED">완료</option>
                  <option value="CANCELLED">취소</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={editProject.startDate}
                    onChange={(e) => setEditProject({ ...editProject, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={editProject.endDate}
                    onChange={(e) => setEditProject({ ...editProject, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDeleteProject}
                  className="text-error hover:bg-error/10"
                >
                  <Icon name="delete" size="sm" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowEditModal(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={updateProject.isPending}
                >
                  {updateProject.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 빠른 일정 추가 모달 */}
      {showQuickScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-sm transform animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
              <h2 className="text-lg font-bold text-text dark:text-white flex items-center gap-2">
                <Icon name="event" size="md" className="text-sky-500" />
                빠른 일정 추가
              </h2>
              <button
                onClick={() => setShowQuickScheduleModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
              >
                <Icon name="close" size="md" />
              </button>
            </div>
            <form onSubmit={handleQuickScheduleSubmit} className="p-4 space-y-4">
              {/* 일정 제목 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  일정 제목 *
                </label>
                <input
                  type="text"
                  value={quickSchedule.title}
                  onChange={(e) => setQuickSchedule({ ...quickSchedule, title: e.target.value })}
                  placeholder="예: 팀 미팅, 휴가 등"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* 일정 유형 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  유형
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "MEETING", label: "회의", icon: "videocam", color: "emerald" },
                    { value: "DEADLINE", label: "마감", icon: "flag", color: "red" },
                    { value: "PERSONAL_LEAVE", label: "휴가", icon: "beach_access", color: "sky" },
                    { value: "PERSONAL_SCHEDULE", label: "개인", icon: "person", color: "violet" },
                    { value: "TEAM_OFFSITE", label: "외근", icon: "groups", color: "amber" },
                    { value: "OTHER", label: "기타", icon: "event", color: "slate" },
                  ].map(({ value, label, icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuickSchedule({ ...quickSchedule, type: value })}
                      className={`
                        flex flex-col items-center gap-1 p-2 rounded-lg border transition-all
                        ${quickSchedule.type === value
                          ? `bg-${color}-100 dark:bg-${color}-900/30 border-${color}-300 dark:border-${color}-700 text-${color}-600 dark:text-${color}-400`
                          : "bg-surface dark:bg-background-dark border-border dark:border-border-dark text-text-secondary hover:border-primary/50"
                        }
                      `}
                    >
                      <Icon name={icon} size="sm" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 종일 여부 */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickSchedule.isAllDay}
                    onChange={(e) => setQuickSchedule({ ...quickSchedule, isAllDay: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text dark:text-white">종일</span>
                </label>
              </div>

              {/* 시간 선택 (종일이 아닐 경우) */}
              {!quickSchedule.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={quickSchedule.startTime}
                      onChange={(e) => setQuickSchedule({ ...quickSchedule, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={quickSchedule.endTime}
                      onChange={(e) => setQuickSchedule({ ...quickSchedule, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 안내 메시지 */}
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <Icon name="info" size="xs" />
                오늘 날짜({todayFormatted})로 일정이 추가됩니다.
              </p>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowQuickScheduleModal(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  leftIcon="add"
                >
                  추가
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 프로젝트 개요 모달 */}
      {showOverviewModal && overviewProject && (
        <ProjectOverviewModal
          project={overviewProject}
          isOpen={showOverviewModal}
          onClose={() => {
            setShowOverviewModal(false);
            setOverviewProject(null);
          }}
          onSave={handleSaveOverview}
        />
      )}

      {/* 프로젝트 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="프로젝트 삭제"
        message={
          editingProject
            ? `"${editingProject.name}" 프로젝트를 삭제하시겠습니까?\n\n관련된 모든 태스크와 데이터가 삭제됩니다.`
            : ""
        }
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteProject.isPending}
      />
    </div>
  );
}

