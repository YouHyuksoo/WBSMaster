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

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Button, Card, Input, useToast } from "@/components/ui";
import { useProjects, useTasks, useCreateProject, useUpdateProject, useDeleteProject, useWbsStats, useIssueStats, useRequirementStats, useTodaySchedules } from "@/hooks";
import { useProject } from "@/contexts/ProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/lib/api";

/** 로컬 사용자 타입 */
interface LocalUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role?: string;
}
/** 프로젝트 타입 확장 (WBS 단위업무 정보 포함) */
interface ProjectWithWbs extends Project {
  calculatedProgress?: number;
  totalUnitTasks?: number;
  completedUnitTasks?: number;
}

/** 통계 카드 Props */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  change?: string;
  changeType?: "up" | "down";
  /** 클릭 시 이동할 경로 */
  href?: string;
  /** 툴팁 텍스트 */
  tooltip?: string;
  /** 애니메이션 딜레이 (staggered animation) */
  animationDelay?: number;
}

/**
 * 통계 카드 컴포넌트 - 클릭 가능, 호버 효과, 애니메이션 적용
 */
function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  change,
  changeType,
  href,
  tooltip,
  animationDelay = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const router = useRouter();

  /** 마운트 시 애니메이션 트리거 */
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  /** 카드 클릭 핸들러 */
  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`
        relative bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5
        flex items-center gap-4
        transform transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        ${href ? "cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]" : ""}
      `}
    >
      {/* 툴팁 */}
      {tooltip && showTooltip && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap animate-fadeIn">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
        </div>
      )}

      <div
        className={`size-12 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon name={icon} size="md" className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-text dark:text-white">{value}</p>
          {change && (
            <span
              className={`text-xs font-medium ${
                changeType === "up" ? "text-success" : "text-error"
              }`}
            >
              {changeType === "up" ? "+" : "-"}
              {change}
            </span>
          )}
        </div>
      </div>

      {/* 클릭 가능 표시 */}
      {href && (
        <Icon name="arrow_forward" size="sm" className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

/**
 * 프로젝트 카드 컴포넌트 - 클릭하면 칸반보드로 이동, 애니메이션 적용
 */
function ProjectCard({
  project,
  onEdit,
  animationDelay = 0,
}: {
  project: ProjectWithWbs;
  onEdit: (project: ProjectWithWbs, e: React.MouseEvent) => void;
  animationDelay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [progressAnimated, setProgressAnimated] = useState(0);
  const router = useRouter();

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    PLANNING: { label: "계획", color: "bg-text-secondary/20 text-text-secondary", icon: "edit_note" },
    ACTIVE: { label: "진행중", color: "bg-success/20 text-success", icon: "play_arrow" },
    ON_HOLD: { label: "보류", color: "bg-warning/20 text-warning", icon: "pause" },
    COMPLETED: { label: "완료", color: "bg-primary/20 text-primary", icon: "check_circle" },
    CANCELLED: { label: "취소", color: "bg-error/20 text-error", icon: "cancel" },
  };

  const { label, color, icon: statusIcon } = statusConfig[project.status] || statusConfig.PLANNING;
  const displayProgress = project.calculatedProgress ?? project.progress;
  const totalUnitTasks = project.totalUnitTasks ?? 0;
  const completedUnitTasks = project.completedUnitTasks ?? 0;
  const membersCount = project.teamMembers?.length || 1;

  /** 카드 등장 애니메이션 */
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  /** 진행률 바 애니메이션 */
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setProgressAnimated(displayProgress);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, displayProgress]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  /** 카드 클릭 핸들러 (칸반으로 이동) */
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    router.push(`/dashboard/kanban?projectId=${project.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        relative bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5
        cursor-pointer group block
        transform transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02]
        active:scale-[0.98]
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-text dark:text-white group-hover:text-primary transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
            {project.description || "설명 없음"}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} shrink-0 flex items-center gap-1`}>
          <Icon name={statusIcon} size="xs" />
          {label}
        </span>
      </div>

      {/* 기간 표시 */}
      {(project.startDate || project.endDate) && (
        <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
          <Icon name="calendar_month" size="xs" />
          <span>
            {formatDate(project.startDate) || "시작일 미정"} ~ {formatDate(project.endDate) || "종료일 미정"}
          </span>
        </div>
      )}

      {/* 진행률 바 - 애니메이션 적용 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary">진행률</span>
          <span className={`font-bold transition-colors ${
            progressAnimated >= 80 ? "text-emerald-500" :
            progressAnimated >= 50 ? "text-sky-500" :
            progressAnimated >= 20 ? "text-amber-500" : "text-text dark:text-white"
          }`}>
            {progressAnimated}%
          </span>
        </div>
        <div className="h-2.5 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              progressAnimated >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
              progressAnimated >= 50 ? "bg-gradient-to-r from-sky-400 to-sky-500" :
              progressAnimated >= 20 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
              "bg-gradient-to-r from-primary to-primary-hover"
            }`}
            style={{ width: `${progressAnimated}%` }}
          />
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <div className="flex items-center gap-1 hover:text-primary transition-colors">
          <Icon name="group" size="xs" />
          <span>{membersCount}명</span>
        </div>
        <div className="flex items-center gap-1 hover:text-primary transition-colors">
          <Icon name="checklist" size="xs" />
          <span>{totalUnitTasks > 0 ? `${completedUnitTasks}/${totalUnitTasks}개 단위업무` : "단위업무 없음"}</span>
        </div>
        {/* 마감일 경고 */}
        {project.endDate && new Date(project.endDate) < new Date() && project.status !== "COMPLETED" && (
          <div className="flex items-center gap-1 text-error animate-pulse">
            <Icon name="warning" size="xs" />
            <span>마감 지남</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 대시보드 메인 페이지 - 인터랙티브 버전
 */
export default function DashboardPage() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuickScheduleModal, setShowQuickScheduleModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithWbs | null>(null);
  /** 프로젝트 상태 필터 */
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  /** 검색어 */
  const [searchQuery, setSearchQuery] = useState("");
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

  /** 현재 선택된 프로젝트 */
  const { selectedProjectId } = useProject();

  /** 오늘의 일정 조회 (전체 인원) */
  const { data: todaySchedules = [], isLoading: schedulesLoading } = useTodaySchedules({
    projectId: selectedProjectId || undefined,
  });

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

  // 통계 계산
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
    pendingTasks: tasks.filter((t) => t.status === "PENDING").length,
  };

  /** 필터링된 프로젝트 목록 */
  const filteredProjects = projects.filter((p) => {
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
          projectId: selectedProjectId || undefined,
        }),
      });

      if (!response.ok) throw new Error("일정 생성 실패");

      toast.success("일정이 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["today-schedules"] });
      setQuickSchedule({ title: "", type: "MEETING", isAllDay: true, startTime: "", endTime: "" });
      setShowQuickScheduleModal(false);
    } catch (error) {
      toast.error("일정 추가에 실패했습니다.");
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
  const handleDeleteProject = async () => {
    if (!editingProject) return;
    if (!confirm(`"${editingProject.name}" 프로젝트를 삭제하시겠습니까?\n\n관련된 모든 태스크와 데이터가 삭제됩니다.`)) return;

    try {
      await deleteProject.mutateAsync(editingProject.id);
      toast.success("프로젝트가 삭제되었습니다.");
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-text dark:text-white">
              안녕하세요, {userName}님!
            </h1>
            <p className="text-sm text-text-secondary">
              오늘도 프로젝트를 효율적으로 관리해보세요.
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

            <Link
              href="/dashboard/projects"
              className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 shrink-0"
            >
              전체 보기
              <Icon name="arrow_forward" size="xs" />
            </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.slice(0, 6).map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleOpenEditModal}
                animationDelay={index * 100}
              />
            ))}
          </div>
        )}

        {/* 더 많은 프로젝트가 있을 경우 */}
        {filteredProjects.length > 6 && (
          <div className="mt-4 text-center">
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary hover:text-primary-hover font-medium hover:bg-primary/10 rounded-lg transition-colors"
            >
              {filteredProjects.length - 6}개 더 보기
              <Icon name="arrow_forward" size="sm" />
            </Link>
          </div>
        )}
      </div>

      {/* 현황 대시보드 - 왼쪽 일정 + 오른쪽 2x2 통계 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 왼쪽: 오늘의 일정 */}
        <div
          onClick={() => router.push("/dashboard/holidays")}
          className="xl:col-span-1 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl cursor-pointer group/card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
        >
          <div className="p-4 h-full flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text dark:text-white flex items-center gap-2 group-hover/card:text-primary transition-colors">
                  <Icon name="today" size="sm" className="text-primary" />
                  오늘의 일정
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">{todayFormatted}</p>
              </div>
              <span className="text-xs text-primary group-hover/card:text-primary-hover flex items-center gap-1">
                전체보기
                <Icon name="arrow_forward" size="xs" className="group-hover/card:translate-x-0.5 transition-transform" />
              </span>
            </div>

            {/* 일정 목록 */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
              {todaySchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Icon name="event_available" size="xl" className="text-text-secondary mb-2" />
                  <p className="text-sm text-text-secondary">오늘 등록된 일정이 없습니다</p>
                  <span className="mt-2 text-xs text-primary group-hover/card:text-primary-hover">
                    일정 등록하기
                  </span>
                </div>
              ) : (
                todaySchedules.map((schedule) => {
                  const typeConfig = scheduleTypeConfig[schedule.type] || scheduleTypeConfig.OTHER;
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-surface-dark transition-colors"
                    >
                      {/* 담당자 아바타 */}
                      {schedule.user?.avatar ? (
                        <img
                          src={schedule.user.avatar}
                          alt={schedule.user.name || ""}
                          className="size-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                          {schedule.user?.name ? (
                            <span className="text-sm font-semibold">
                              {schedule.user.name.charAt(0)}
                            </span>
                          ) : (
                            <Icon name={typeConfig.icon} size="sm" />
                          )}
                        </div>
                      )}
                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-text dark:text-white truncate">
                            {schedule.title}
                          </h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                        </div>
                        {schedule.description && (
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                            {schedule.description}
                          </p>
                        )}
                        {/* 담당자 이름 + 시간 정보 */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                          {schedule.user?.name && (
                            <span className="flex items-center gap-1 font-medium text-text dark:text-white">
                              {schedule.user.name}
                            </span>
                          )}
                          {schedule.isAllDay ? (
                            <span className="flex items-center gap-1">
                              <Icon name="schedule" size="xs" />
                              종일
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Icon name="schedule" size="xs" />
                              {schedule.startTime || "00:00"} - {schedule.endTime || "23:59"}
                            </span>
                          )}
                          {schedule.project && (
                            <span className="flex items-center gap-1">
                              <Icon name="folder" size="xs" />
                              {schedule.project.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 일정 개수 요약 */}
            {todaySchedules.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">오늘 일정</span>
                  <span className="font-bold text-primary">{todaySchedules.length}개</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 2x2 통계 그리드 */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 담당자별 진행률 (WBS 기준) */}
          <div
            onClick={() => router.push("/dashboard/wbs")}
            className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 cursor-pointer group/wbs hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text dark:text-white group-hover/wbs:text-primary transition-colors">
                담당자별 진행률
                <span className="text-xs font-normal text-text-secondary ml-1">(WBS)</span>
              </h3>
              <span className="text-xs text-primary group-hover/wbs:text-primary-hover flex items-center gap-1">
                전체보기
                <Icon name="arrow_forward" size="xs" className="group-hover/wbs:translate-x-0.5 transition-transform" />
              </span>
            </div>

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 pb-2 border-b border-border dark:border-border-dark">
              <div className="col-span-2">담당자</div>
              <div className="text-center">전체</div>
              <div className="text-center">완료</div>
              <div className="text-center">진행</div>
              <div className="text-center">진행률</div>
            </div>

            {/* 담당자별 목록 */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1">
              {(!wbsStats?.assignees || wbsStats.assignees.length === 0) ? (
                <p className="text-xs text-text-secondary text-center py-4">
                  담당자가 할당된 WBS 항목이 없습니다.
                </p>
              ) : (
                wbsStats.assignees.map((assignee, index) => {
                  // 진행률은 0~100 범위로 제한
                  const progressValue = Math.min(Math.max(assignee.avgProgress || 0, 0), 100);
                  return (
                    <div
                      key={assignee.id}
                      className="grid grid-cols-6 gap-2 items-center py-1.5 hover:bg-surface dark:hover:bg-background-dark rounded-lg px-1 transition-colors"
                    >
                      {/* 담당자 */}
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        {assignee.avatar ? (
                          <img
                            src={assignee.avatar}
                            alt={assignee.name}
                            className="size-5 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">
                              {assignee.id === "unassigned" ? "?" : assignee.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-text dark:text-white truncate font-medium">
                          {assignee.name}
                        </span>
                      </div>

                      {/* 전체 */}
                      <div className="text-center">
                        <span className="text-xs font-bold text-text dark:text-white">{assignee.total}</span>
                      </div>

                      {/* 완료 */}
                      <div className="text-center">
                        <span className={`text-xs font-bold ${assignee.completed > 0 ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
                          {assignee.completed}
                        </span>
                      </div>

                      {/* 진행중 */}
                      <div className="text-center">
                        <span className={`text-xs font-bold ${assignee.inProgress > 0 ? "text-sky-500" : "text-slate-300 dark:text-slate-600"}`}>
                          {assignee.inProgress}
                        </span>
                      </div>

                      {/* 진행률 (100% 기준 막대바) - 호버 시 산출근거 표시 */}
                      <div className="flex items-center gap-1 group/progress relative">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progressValue >= 80 ? "bg-emerald-400" :
                              progressValue >= 50 ? "bg-sky-400" :
                              progressValue >= 30 ? "bg-amber-400" : "bg-rose-400"
                            }`}
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold w-8 text-right cursor-help ${
                          progressValue >= 80 ? "text-emerald-500" :
                          progressValue >= 50 ? "text-sky-500" :
                          "text-slate-400"
                        }`}>
                          {progressValue}%
                        </span>
                        {/* 산출근거 툴팁 - 첫 2개 행은 아래로, 나머지는 위로 */}
                        <div className={`absolute right-0 hidden group-hover/progress:block z-50 ${
                          index < 2 ? "top-full mt-2" : "bottom-full mb-2"
                        }`}>
                          <div className="bg-slate-900 text-white text-[10px] rounded-lg px-3 py-2 shadow-lg whitespace-nowrap relative">
                            {/* 위쪽 화살표 (아래에 툴팁이 표시될 때) */}
                            {index < 2 && (
                              <div className="absolute top-0 right-4 -translate-y-full">
                                <div className="border-8 border-transparent border-b-slate-900"></div>
                              </div>
                            )}
                            <div className="font-bold text-amber-400 mb-1">📊 산출근거</div>
                            <div className="space-y-0.5">
                              <div>• 담당 WBS 항목: <span className="text-sky-400">{assignee.total}개</span></div>
                              <div>• 각 항목 progress 합계: <span className="text-sky-400">{assignee.totalProgress}%</span></div>
                              <div className="border-t border-slate-700 pt-1 mt-1">
                                • 평균 진행률: {assignee.totalProgress} ÷ {assignee.total} = <span className="text-emerald-400 font-bold">{progressValue}%</span>
                              </div>
                            </div>
                            {/* 아래쪽 화살표 (위에 툴팁이 표시될 때) */}
                            {index >= 2 && (
                              <div className="absolute bottom-0 right-4 translate-y-full">
                                <div className="border-8 border-transparent border-t-slate-900"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 합계 */}
            {wbsStats?.total && (
              <div className="grid grid-cols-6 gap-2 items-center mt-2 pt-2 border-t border-border dark:border-border-dark">
                <div className="col-span-2 text-xs font-bold text-text dark:text-white">합계</div>
                <div className="text-center text-xs font-bold text-text dark:text-white">{wbsStats.total.total}</div>
                <div className="text-center text-xs font-bold text-emerald-500">{wbsStats.total.completed}</div>
                <div className="text-center text-xs font-bold text-sky-500">{wbsStats.total.inProgress}</div>
                <div className="text-center text-xs font-bold text-primary">
                  {wbsStats.total.total > 0 ? Math.round((wbsStats.total.completed / wbsStats.total.total) * 100) : 0}%
                </div>
              </div>
            )}
          </div>

          {/* TASK 현황 - 담당자별 */}
          <div
            onClick={() => router.push("/dashboard/kanban")}
            className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 cursor-pointer group/task hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text dark:text-white group-hover/task:text-primary transition-colors">TASK 현황</h3>
              <span className="text-xs text-primary group-hover/task:text-primary-hover flex items-center gap-1">
                전체보기
                <Icon name="arrow_forward" size="xs" className="group-hover/task:translate-x-0.5 transition-transform" />
              </span>
            </div>

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-5 gap-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 pb-2 border-b border-border dark:border-border-dark">
              <div>담당자</div>
              <div className="text-center">대기</div>
              <div className="text-center">진행</div>
              <div className="text-center">완료</div>
              <div className="text-center">지연</div>
            </div>

            {/* 담당자별 목록 */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {(() => {
                // 담당자별 TASK 그룹핑
                const assigneeMap = new Map<string, {
                  id: string;
                  name: string;
                  avatar?: string;
                  pending: number;
                  inProgress: number;
                  completed: number;
                  delayed: number;
                }>();

                // TASK 데이터에서 담당자별 집계
                tasks.forEach((task) => {
                  // 주 담당자 확인, 없으면 부 담당자 중 첫 번째 사용
                  const primaryAssignee = task.assignee || (task.assignees && task.assignees.length > 0 ? task.assignees[0] : null);
                  const assigneeId = primaryAssignee?.id || "unassigned";
                  const assigneeName = primaryAssignee?.name || "미할당";
                  const assigneeAvatar = primaryAssignee?.avatar;

                  if (!assigneeMap.has(assigneeId)) {
                    assigneeMap.set(assigneeId, {
                      id: assigneeId,
                      name: assigneeName,
                      avatar: assigneeAvatar,
                      pending: 0,
                      inProgress: 0,
                      completed: 0,
                      delayed: 0,
                    });
                  }

                  const assignee = assigneeMap.get(assigneeId)!;

                  // 상태별 카운트 (DELAYED 상태 포함)
                  if (task.status === "PENDING") assignee.pending++;
                  else if (task.status === "IN_PROGRESS") assignee.inProgress++;
                  else if (task.status === "COMPLETED") assignee.completed++;
                  else if (task.status === "DELAYED") assignee.delayed++;

                  // 추가 지연 체크 (마감일이 지났고 완료되지 않은 경우)
                  if (task.status !== "DELAYED" && task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED") {
                    assignee.delayed++;
                  }
                });

                const assignees = Array.from(assigneeMap.values());

                if (assignees.length === 0) {
                  return (
                    <div className="text-center py-6 text-text-secondary text-xs">
                      등록된 TASK가 없습니다
                    </div>
                  );
                }

                return assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="grid grid-cols-5 gap-2 items-center py-1.5 hover:bg-surface dark:hover:bg-background-dark rounded-lg px-1 transition-colors"
                  >
                    {/* 담당자 */}
                    <div className="flex items-center gap-2 min-w-0">
                      {assignee.avatar ? (
                        <img
                          src={assignee.avatar}
                          alt={assignee.name}
                          className="size-5 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary">
                            {assignee.id === "unassigned" ? "?" : assignee.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-text dark:text-white truncate font-medium">
                        {assignee.name}
                      </span>
                    </div>

                    {/* 대기 */}
                    <div className="text-center">
                      <span className={`text-xs font-bold ${assignee.pending > 0 ? "text-slate-500" : "text-slate-300 dark:text-slate-600"}`}>
                        {assignee.pending}
                      </span>
                    </div>

                    {/* 진행 */}
                    <div className="text-center">
                      <span className={`text-xs font-bold ${assignee.inProgress > 0 ? "text-sky-500" : "text-slate-300 dark:text-slate-600"}`}>
                        {assignee.inProgress}
                      </span>
                    </div>

                    {/* 완료 */}
                    <div className="text-center">
                      <span className={`text-xs font-bold ${assignee.completed > 0 ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
                        {assignee.completed}
                      </span>
                    </div>

                    {/* 지연 */}
                    <div className="text-center">
                      <span className={`text-xs font-bold ${assignee.delayed > 0 ? "text-rose-500" : "text-slate-300 dark:text-slate-600"}`}>
                        {assignee.delayed}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* 합계 - TASK 데이터 기준으로 계산 */}
            <div className="grid grid-cols-5 gap-2 items-center mt-2 pt-2 border-t border-border dark:border-border-dark">
              <div className="text-xs font-bold text-text dark:text-white">합계</div>
              <div className="text-center text-xs font-bold text-slate-500">
                {tasks.filter((t) => t.status === "PENDING").length}
              </div>
              <div className="text-center text-xs font-bold text-sky-500">
                {tasks.filter((t) => t.status === "IN_PROGRESS").length}
              </div>
              <div className="text-center text-xs font-bold text-emerald-500">
                {tasks.filter((t) => t.status === "COMPLETED").length}
              </div>
              <div className="text-center text-xs font-bold text-rose-500">
                {tasks.filter((t) => t.status === "DELAYED" || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")).length}
              </div>
            </div>
          </div>

          {/* 이슈 현황 */}
          <div
            onClick={() => router.push("/dashboard/issues")}
            className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl cursor-pointer group/issue hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-text dark:text-white group-hover/issue:text-primary transition-colors">이슈 현황</h3>
                <span className="text-xs text-primary group-hover/issue:text-primary-hover flex items-center gap-1">
                  전체보기
                  <Icon name="arrow_forward" size="xs" className="group-hover/issue:translate-x-0.5 transition-transform" />
                </span>
              </div>

              {/* 카테고리별 차트 */}
              <div className="space-y-1.5">
                {(!issueStats?.categories || issueStats.categories.length === 0) ? (
                  <p className="text-xs text-text-secondary text-center py-4">등록된 이슈가 없습니다.</p>
                ) : (
                  issueStats.categories.map((cat) => {
                    const resolvedPercent = cat.total > 0 ? (cat.resolved / cat.total) * 100 : 0;
                    const unresolvedPercent = cat.total > 0 ? (cat.unresolved / cat.total) * 100 : 0;
                    return (
                      <div key={cat.category} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-text dark:text-white font-medium">{cat.label}</span>
                          <span className="text-text-secondary">{cat.resolved}/{cat.total}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          <div className="h-full bg-teal-400" style={{ width: `${resolvedPercent}%` }} />
                          <div className="h-full bg-rose-300" style={{ width: `${unresolvedPercent}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 범례 및 총계 + 해결율 */}
              {issueStats && (
                <div className="mt-3 pt-2 border-t border-border dark:border-border-dark">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-teal-400" />
                        <span className="text-[10px] text-text-secondary">해결</span>
                        <span className="text-xs font-bold text-teal-500 ml-0.5">{issueStats.total.resolved}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-rose-300" />
                        <span className="text-[10px] text-text-secondary">미해결</span>
                        <span className="text-xs font-bold text-rose-400 ml-0.5">{issueStats.total.unresolved}</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-text-secondary">해결율 </span>
                      <span className={`font-bold ${
                        (issueStats.total.resolved + issueStats.total.unresolved) > 0 &&
                        Math.round((issueStats.total.resolved / (issueStats.total.resolved + issueStats.total.unresolved)) * 100) >= 70
                          ? "text-emerald-500"
                          : Math.round((issueStats.total.resolved / (issueStats.total.resolved + issueStats.total.unresolved)) * 100) >= 50
                          ? "text-sky-500"
                          : "text-rose-500"
                      }`}>
                        {(issueStats.total.resolved + issueStats.total.unresolved) > 0
                          ? Math.round((issueStats.total.resolved / (issueStats.total.resolved + issueStats.total.unresolved)) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 요구사항 현황 */}
          <div
            onClick={() => router.push("/dashboard/requirements")}
            className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl cursor-pointer group/req hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-text dark:text-white group-hover/req:text-primary transition-colors">요구사항</h3>
                <span className="text-xs text-primary group-hover/req:text-primary-hover flex items-center gap-1">
                  전체보기
                  <Icon name="arrow_forward" size="xs" className="group-hover/req:translate-x-0.5 transition-transform" />
                </span>
              </div>

              {/* 상태별 요약 */}
              {reqStats && (
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-slate-500">{reqStats.total.draft}</div>
                    <div className="text-[10px] text-text-secondary">초안</div>
                  </div>
                  <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-sky-500">{reqStats.total.approved}</div>
                    <div className="text-[10px] text-text-secondary">승인</div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-rose-400">{reqStats.total.rejected}</div>
                    <div className="text-[10px] text-text-secondary">반려</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-emerald-500">{reqStats.total.implemented}</div>
                    <div className="text-[10px] text-text-secondary">구현</div>
                  </div>
                </div>
              )}

              {/* 담당자별 처리율 */}
              <div className="space-y-2">
                {(!reqStats?.assignees || reqStats.assignees.length === 0) ? (
                  <p className="text-xs text-text-secondary text-center py-4">
                    담당자가 할당된 요구사항이 없습니다.
                  </p>
                ) : (
                  reqStats.assignees.map((assignee) => (
                    <div key={assignee.id} className="flex items-center gap-2">
                      {/* 아바타 */}
                      {assignee.avatar ? (
                        <img
                          src={assignee.avatar}
                          alt={assignee.name}
                          className="size-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-6 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-sky-500">
                            {assignee.id === "unassigned" ? "?" : assignee.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {/* 이름 및 진행률 바 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-text dark:text-white truncate font-medium">
                            {assignee.name}
                          </span>
                          <span className="text-text-secondary shrink-0 ml-1">
                            {assignee.implemented + assignee.approved}/{assignee.total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${assignee.total > 0 ? (assignee.implemented / assignee.total) * 100 : 0}%` }}
                            title={`구현완료: ${assignee.implemented}건`}
                          />
                          <div
                            className="h-full bg-sky-400"
                            style={{ width: `${assignee.total > 0 ? (assignee.approved / assignee.total) * 100 : 0}%` }}
                            title={`승인: ${assignee.approved}건`}
                          />
                          <div
                            className="h-full bg-slate-300"
                            style={{ width: `${assignee.total > 0 ? (assignee.draft / assignee.total) * 100 : 0}%` }}
                            title={`초안: ${assignee.draft}건`}
                          />
                          <div
                            className="h-full bg-rose-300"
                            style={{ width: `${assignee.total > 0 ? (assignee.rejected / assignee.total) * 100 : 0}%` }}
                            title={`반려: ${assignee.rejected}건`}
                          />
                        </div>
                      </div>
                      {/* 처리율 */}
                      <span className={`text-xs font-bold shrink-0 ${
                        assignee.completionRate >= 80 ? "text-emerald-500" :
                        assignee.completionRate >= 50 ? "text-sky-500" :
                        "text-slate-400"
                      }`}>
                        {assignee.completionRate}%
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* 범례 */}
              {reqStats?.assignees && reqStats.assignees.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border dark:border-border-dark flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-text-secondary">구현</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-sky-400" />
                    <span className="text-[10px] text-text-secondary">승인</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-slate-300" />
                    <span className="text-[10px] text-text-secondary">초안</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-rose-300" />
                    <span className="text-[10px] text-text-secondary">반려</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}

