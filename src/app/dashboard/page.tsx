/**
 * @file src/app/dashboard/page.tsx
 * @description
 * 대시보드 메인 페이지입니다.
 * 프로젝트 목록, 통계, 최근 활동 등을 표시합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **통계 카드**: 전체 프로젝트, 진행중, 완료됨 등의 통계
 * 2. **프로젝트 목록**: 참여중인 프로젝트 목록
 * 3. **최근 활동**: 최근 작업 내역
 *
 * 수정 방법:
 * - 통계 추가: StatCard 컴포넌트 복사하여 추가
 * - 프로젝트 카드 수정: ProjectCard 내용 변경
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon, Button, Card, Input, useToast } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useProjects, useTasks, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks";
import type { User } from "@supabase/supabase-js";
import type { Project } from "@/lib/api";

/** 통계 카드 Props */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  change?: string;
  changeType?: "up" | "down";
}

/**
 * 통계 카드 컴포넌트
 */
function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  change,
  changeType,
}: StatCardProps) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 flex items-center gap-4">
      <div
        className={`size-12 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0`}
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
    </div>
  );
}

/**
 * 프로젝트 카드 컴포넌트
 */
function ProjectCard({
  project,
  onEdit,
}: {
  project: Project;
  onEdit: (project: Project, e: React.MouseEvent) => void;
}) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    PLANNING: { label: "계획", color: "bg-text-secondary/20 text-text-secondary" },
    ACTIVE: { label: "진행중", color: "bg-success/20 text-success" },
    ON_HOLD: { label: "보류", color: "bg-warning/20 text-warning" },
    COMPLETED: { label: "완료", color: "bg-primary/20 text-primary" },
    CANCELLED: { label: "취소", color: "bg-error/20 text-error" },
  };

  const { label, color } = statusConfig[project.status] || statusConfig.PLANNING;
  const tasksCount = project._count?.tasks || 0;
  const membersCount = project.teamMembers?.length || 1;

  // 날짜 포맷
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <Link
      href={`/dashboard/kanban?projectId=${project.id}`}
      className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer group block relative"
    >
      {/* 편집 버튼 */}
      <button
        onClick={(e) => onEdit(project, e)}
        className="absolute top-3 right-3 p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        title="프로젝트 수정"
      >
        <Icon name="edit" size="sm" />
      </button>

      <div className="flex items-start justify-between mb-3 pr-8">
        <div>
          <h3 className="text-lg font-bold text-text dark:text-white group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
            {project.description || "설명 없음"}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} shrink-0`}>
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

      {/* 진행률 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary">진행률</span>
          <span className="font-medium text-text dark:text-white">{project.progress}%</span>
        </div>
        <div className="h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <div className="flex items-center gap-1">
          <Icon name="group" size="xs" />
          <span>{membersCount}명</span>
        </div>
        <div className="flex items-center gap-1">
          <Icon name="task" size="xs" />
          <span>{tasksCount}개 작업</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * 대시보드 메인 페이지
 */
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
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
  const supabase = createClient();
  const toast = useToast();

  /** 프로젝트 목록 조회 */
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  /** 태스크 목록 조회 (전체) */
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();

  /** 프로젝트 생성 */
  const createProject = useCreateProject();

  /** 프로젝트 수정 */
  const updateProject = useUpdateProject();

  /** 프로젝트 삭제 */
  const deleteProject = useDeleteProject();

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  // 사용자 이름 추출
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "사용자";

  // 통계 계산
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
    pendingTasks: tasks.filter((t) => t.status === "PENDING").length,
  };

  // 최근 태스크 (최신순 5개)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

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
  const handleOpenEditModal = (project: Project, e: React.MouseEvent) => {
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
  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 환영 메시지 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-white">
            안녕하세요, {userName}님!
          </h1>
          <p className="text-text-secondary mt-1">
            오늘도 프로젝트를 효율적으로 관리해보세요.
          </p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={() => setShowCreateModal(true)}>
          새 프로젝트
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 프로젝트"
          value={stats.totalProjects}
          icon="folder"
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="진행중"
          value={stats.activeProjects}
          icon="trending_up"
          iconBgColor="bg-success/10"
          iconColor="text-success"
        />
        <StatCard
          title="완료됨"
          value={stats.completedProjects}
          icon="check_circle"
          iconBgColor="bg-text-secondary/10"
          iconColor="text-text-secondary"
        />
        <StatCard
          title="전체 작업"
          value={stats.totalTasks}
          icon="task_alt"
          iconBgColor="bg-warning/10"
          iconColor="text-warning"
          change={String(stats.pendingTasks)}
          changeType="up"
        />
      </div>

      {/* 프로젝트 목록 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text dark:text-white">내 프로젝트</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
          >
            전체 보기
            <Icon name="arrow_forward" size="xs" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} onEdit={handleOpenEditModal} />
            ))}
          </div>
        )}
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 작업 */}
        <Card>
          <div className="p-5">
            <h3 className="text-lg font-bold text-text dark:text-white mb-4">최근 작업</h3>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">
                  최근 작업이 없습니다.
                </p>
              ) : (
                recentTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const timeAgo = getTimeAgo(task.updatedAt);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-surface-dark transition-colors cursor-pointer"
                    >
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon name="task_alt" size="xs" className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text dark:text-white truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {project?.name || "Unknown Project"}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary shrink-0">{timeAgo}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* 작업 현황 */}
        <Card>
          <div className="p-5">
            <h3 className="text-lg font-bold text-text dark:text-white mb-4">작업 현황</h3>
            <div className="space-y-4">
              {/* 대기중 */}
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-text-secondary" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text dark:text-white">대기중</span>
                    <span className="text-text-secondary">{stats.pendingTasks}개</span>
                  </div>
                  <div className="h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-text-secondary rounded-full"
                      style={{
                        width:
                          stats.totalTasks > 0
                            ? `${(stats.pendingTasks / stats.totalTasks) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 진행중 */}
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text dark:text-white">진행중</span>
                    <span className="text-text-secondary">
                      {tasks.filter((t) => t.status === "IN_PROGRESS").length}개
                    </span>
                  </div>
                  <div className="h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width:
                          stats.totalTasks > 0
                            ? `${(tasks.filter((t) => t.status === "IN_PROGRESS").length / stats.totalTasks) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 완료 */}
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-success" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text dark:text-white">완료</span>
                    <span className="text-text-secondary">{stats.completedTasks}개</span>
                  </div>
                  <div className="h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{
                        width:
                          stats.totalTasks > 0
                            ? `${(stats.completedTasks / stats.totalTasks) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 완료율 */}
            <div className="mt-6 pt-4 border-t border-border dark:border-border-dark">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">전체 완료율</span>
                <span className="text-2xl font-bold text-success">
                  {stats.totalTasks > 0
                    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </Card>
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
    </div>
  );
}

/**
 * 시간 경과 계산 헬퍼 함수
 */
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR");
}
