/**
 * @file src/app/dashboard/projects/page.tsx
 * @description
 * 프로젝트 목록 페이지입니다.
 * 전체 프로젝트를 그리드/리스트 형태로 보여주고 생성/관리합니다.
 *
 * 초보자 가이드:
 * 1. **프로젝트 카드**: 각 프로젝트 정보 표시
 * 2. **새 프로젝트**: 프로젝트 생성 모달
 * 3. **필터/검색**: 프로젝트 필터링
 *
 * 수정 방법:
 * - 프로젝트 필드 추가: ProjectCard props 확장
 * - 정렬 옵션 추가: sortOptions 배열에 추가
 */

"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Icon, Button, Input } from "@/components/ui";
import { useProjects, useCreateProject } from "@/hooks";
import type { Project } from "@/lib/api";

// 대시보드와 동일한 ProjectCard 컴포넌트 사용
import ProjectCard, { type ProjectWithWbs } from "../components/ProjectCard";

/** 상태 설정 (리스트 뷰용) */
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  PLANNING: { label: "계획", color: "text-text-secondary", bgColor: "bg-text-secondary/20", icon: "edit_note" },
  ACTIVE: { label: "진행중", color: "text-success", bgColor: "bg-success/20", icon: "play_arrow" },
  ON_HOLD: { label: "보류", color: "text-warning", bgColor: "bg-warning/20", icon: "pause" },
  COMPLETED: { label: "완료", color: "text-primary", bgColor: "bg-primary/20", icon: "check_circle" },
  CANCELLED: { label: "취소", color: "text-error", bgColor: "bg-error/20", icon: "cancel" },
};

/**
 * 프로젝트 목록 페이지
 */
export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithWbs | null>(null);

  // 새 프로젝트 폼 상태
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectStartDate, setNewProjectStartDate] = useState("");
  const [newProjectEndDate, setNewProjectEndDate] = useState("");

  /**
   * 프로젝트 편집 모달 열기
   */
  const handleOpenEditModal = (project: ProjectWithWbs, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setShowEditModal(true);
  };

  /**
   * 프로젝트 개요 모달 열기 (현재는 편집과 동일하게 처리)
   */
  const handleOpenOverviewModal = (project: ProjectWithWbs, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 개요 모달이 필요하면 별도 구현, 현재는 편집으로 대체
    setEditingProject(project);
    setShowEditModal(true);
  };

  // API 연동
  const { data: projects = [], isLoading, error } = useProjects(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  ) as { data: ProjectWithWbs[]; isLoading: boolean; error: Error | null };
  const createProject = useCreateProject();

  /**
   * 필터링된 프로젝트 목록
   */
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  /**
   * 새 프로젝트 생성
   */
  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await createProject.mutateAsync({
        name: newProjectName,
        description: newProjectDescription,
        startDate: newProjectStartDate || undefined,
        endDate: newProjectEndDate || undefined,
      });

      // 폼 초기화 및 모달 닫기
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectStartDate("");
      setNewProjectEndDate("");
      setShowNewProjectModal(false);
    } catch (err) {
      console.error("프로젝트 생성 실패:", err);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Icon name="sync" size="lg" className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">프로젝트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Icon name="error" size="lg" className="text-error mx-auto mb-4" />
          <p className="text-text-secondary">프로젝트 목록을 불러올 수 없습니다.</p>
          <p className="text-sm text-error mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background dark:bg-background-dark min-h-screen">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* 뒤로가기 버튼 */}
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary transition-all"
            title="대시보드로 돌아가기"
          >
            <Icon name="arrow_back" size="md" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="folder_copy" className="text-[#00f3ff]" style={{ fontVariationSettings: "'FILL' 1" }} />
              <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
                ALL PROJECTS
              </span>
              <span className="text-slate-400 text-sm font-normal ml-1">
                / 전체 프로젝트
              </span>
            </h1>
            <p className="text-text-secondary mt-1">
              총 {projects.length}개의 프로젝트가 있습니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 통계 배지 */}
          <div className="hidden md:flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-medium">
              진행중 {projects.filter(p => p.status === "ACTIVE").length}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
              완료 {projects.filter(p => p.status === "COMPLETED").length}
            </span>
          </div>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowNewProjectModal(true)}
          >
            새 프로젝트
          </Button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col lg:flex-row gap-4 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
        {/* 검색 */}
        <div className="flex-1 max-w-md">
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
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="all">전체 상태</option>
            <option value="PLANNING">계획중</option>
            <option value="ACTIVE">진행중</option>
            <option value="ON_HOLD">보류</option>
            <option value="COMPLETED">완료</option>
            <option value="CANCELLED">취소</option>
          </select>

          <div className="h-8 w-px bg-border dark:bg-border-dark" />

          {/* 뷰 모드 */}
          <div className="flex bg-surface dark:bg-background-dark rounded-lg p-1 border border-border dark:border-border-dark">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
              title="그리드 보기"
            >
              <Icon name="grid_view" size="sm" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
              title="리스트 보기"
            >
              <Icon name="view_list" size="sm" />
            </button>
          </div>

          {/* 필터 상태 표시 */}
          {(statusFilter !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
            >
              <Icon name="close" size="xs" />
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 프로젝트 목록 */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleOpenEditModal}
              onOverview={handleOpenOverviewModal}
              animationDelay={index * 50}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project, index) => (
            <ProjectListItem key={project.id} project={project} index={index} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {filteredProjects.length === 0 && (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-12 text-center animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="folder_off" size="xl" className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
            프로젝트가 없습니다
          </h3>
          <p className="text-text-secondary mb-6">
            {searchQuery || statusFilter !== "all"
              ? "검색 조건에 맞는 프로젝트가 없습니다. 다른 조건으로 검색해보세요."
              : "새 프로젝트를 생성하여 작업을 시작해보세요."}
          </p>
          {searchQuery || statusFilter !== "all" ? (
            <Button
              variant="ghost"
              leftIcon="refresh"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
            >
              필터 초기화
            </Button>
          ) : (
            <Button variant="primary" leftIcon="add" onClick={() => setShowNewProjectModal(true)}>
              새 프로젝트 생성
            </Button>
          )}
        </div>
      )}

      {/* 새 프로젝트 모달 */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">새 프로젝트</h2>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                label="프로젝트 이름"
                placeholder="프로젝트 이름을 입력하세요"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  설명
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  rows={3}
                  placeholder="프로젝트에 대한 설명을 입력하세요"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="시작일"
                  type="date"
                  value={newProjectStartDate}
                  onChange={(e) => setNewProjectStartDate(e.target.value)}
                />
                <Input
                  label="종료일"
                  type="date"
                  value={newProjectEndDate}
                  onChange={(e) => setNewProjectEndDate(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  fullWidth
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={createProject.isPending}
                >
                  {createProject.isPending ? "생성 중..." : "생성"}
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
 * 프로젝트 리스트 아이템 컴포넌트 (리스트 뷰)
 * 대시보드 카드와 동일한 스타일 적용
 */
function ProjectListItem({ project, index }: { project: ProjectWithWbs; index: number }) {
  const status = statusConfig[project.status] || statusConfig.PLANNING;
  const memberCount = project.teamMembers?.length || 0;
  const displayProgress = project.calculatedProgress ?? project.progress;
  const totalUnitTasks = project.totalUnitTasks ?? 0;
  const completedUnitTasks = project.completedUnitTasks ?? 0;

  /** 날짜 포맷팅 */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <Link href={`/dashboard/kanban?projectId=${project.id}`}>
      <div
        className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group animate-fadeIn"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-center gap-6">
          {/* 상태 아이콘 */}
          <div className={`w-12 h-12 rounded-xl ${status.bgColor} flex items-center justify-center shrink-0`}>
            <Icon name={status.icon} size="md" className={status.color} />
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-text dark:text-white group-hover:text-primary transition-colors truncate">
                {project.name}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color} flex items-center gap-1 shrink-0`}>
                <Icon name={status.icon} size="xs" />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-text-secondary truncate">{project.description || "설명 없음"}</p>
            {/* 기간 표시 */}
            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-1 text-xs text-text-secondary mt-1">
                <Icon name="calendar_month" size="xs" />
                <span>
                  {formatDate(project.startDate) || "시작일 미정"} ~ {formatDate(project.endDate) || "종료일 미정"}
                </span>
              </div>
            )}
          </div>

          {/* 진행률 */}
          <div className="w-36 hidden sm:block">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">진행률</span>
              <span className={`font-bold ${
                displayProgress >= 80 ? "text-emerald-500" :
                displayProgress >= 50 ? "text-sky-500" :
                displayProgress >= 20 ? "text-amber-500" : "text-text dark:text-white"
              }`}>{displayProgress}%</span>
            </div>
            <div className="h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  displayProgress >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                  displayProgress >= 50 ? "bg-gradient-to-r from-sky-400 to-sky-500" :
                  displayProgress >= 20 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                  "bg-gradient-to-r from-primary to-primary-hover"
                }`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center gap-4 text-sm text-text-secondary shrink-0">
            <div className="flex items-center gap-1 hover:text-primary transition-colors">
              <Icon name="group" size="xs" />
              <span>{memberCount}명</span>
            </div>
            <div className="flex items-center gap-1 hover:text-primary transition-colors">
              <Icon name="checklist" size="xs" />
              <span>{totalUnitTasks > 0 ? `${completedUnitTasks}/${totalUnitTasks}` : "0"}</span>
            </div>
            {/* 마감일 경고 */}
            {project.endDate && new Date(project.endDate) < new Date() && project.status !== "COMPLETED" && (
              <div className="flex items-center gap-1 text-error animate-pulse">
                <Icon name="warning" size="xs" />
              </div>
            )}
            <Icon name="chevron_right" size="sm" className="text-text-secondary group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}
