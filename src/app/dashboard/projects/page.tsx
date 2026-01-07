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
import { Icon, Button, Card, Input } from "@/components/ui";
import { useProjects, useCreateProject } from "@/hooks";
import type { Project } from "@/lib/api";

/** 상태 설정 */
const statusConfig: Record<string, { label: string; color: string; bgColor: string; gradient: string }> = {
  PLANNING: { label: "계획중", color: "text-text-secondary", bgColor: "bg-surface", gradient: "from-slate-400 to-slate-500" },
  ACTIVE: { label: "진행중", color: "text-success", bgColor: "bg-success/10", gradient: "from-blue-500 to-indigo-600" },
  ON_HOLD: { label: "보류", color: "text-warning", bgColor: "bg-warning/10", gradient: "from-orange-500 to-red-600" },
  COMPLETED: { label: "완료", color: "text-primary", bgColor: "bg-primary/10", gradient: "from-green-500 to-teal-600" },
  CANCELLED: { label: "취소", color: "text-error", bgColor: "bg-error/10", gradient: "from-red-400 to-red-500" },
};

/**
 * 프로젝트 목록 페이지
 */
export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // 새 프로젝트 폼 상태
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectStartDate, setNewProjectStartDate] = useState("");
  const [newProjectEndDate, setNewProjectEndDate] = useState("");

  // API 연동
  const { data: projects = [], isLoading, error } = useProjects(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
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
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-white">프로젝트</h1>
          <p className="text-text-secondary mt-1">
            총 {projects.length}개의 프로젝트
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon="add"
          onClick={() => setShowNewProjectModal(true)}
        >
          새 프로젝트
        </Button>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 검색 */}
        <div className="flex-1 max-w-md">
          <Input
            leftIcon="search"
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            <option value="all">전체 상태</option>
            <option value="PLANNING">계획중</option>
            <option value="ACTIVE">진행중</option>
            <option value="ON_HOLD">보류</option>
            <option value="COMPLETED">완료</option>
            <option value="CANCELLED">취소</option>
          </select>

          <div className="h-8 w-px bg-border dark:bg-border-dark mx-2" />

          {/* 뷰 모드 */}
          <div className="flex bg-surface dark:bg-background-dark rounded-lg p-1 border border-border dark:border-border-dark">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-dark"
              }`}
              title="그리드 보기"
            >
              <Icon name="grid_view" size="sm" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-dark"
              }`}
              title="리스트 보기"
            >
              <Icon name="view_list" size="sm" />
            </button>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Icon name="folder_off" size="lg" className="text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text dark:text-white mb-2">
            프로젝트가 없습니다
          </h3>
          <p className="text-text-secondary mb-4">
            {searchQuery || statusFilter !== "all"
              ? "검색 조건에 맞는 프로젝트가 없습니다."
              : "새 프로젝트를 생성해보세요."}
          </p>
          <Button variant="primary" leftIcon="add" onClick={() => setShowNewProjectModal(true)}>
            새 프로젝트 생성
          </Button>
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
 * 프로젝트 카드 컴포넌트 (그리드 뷰)
 */
function ProjectCard({ project }: { project: Project }) {
  const status = statusConfig[project.status] || statusConfig.PLANNING;
  const taskCount = project._count?.tasks || 0;
  const memberCount = project.teamMembers?.length || 0;

  return (
    <Link href={`/dashboard/wbs?project=${project.id}`}>
      <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
        <div className="p-5">
          {/* 상단: 그라데이션 바 */}
          <div className={`h-2 rounded-full bg-gradient-to-r ${status.gradient} mb-4`} />

          {/* 제목 및 상태 */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold text-text dark:text-white group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
              {status.label}
            </span>
          </div>

          {/* 설명 */}
          <p className="text-sm text-text-secondary line-clamp-2 mb-4">
            {project.description || "설명 없음"}
          </p>

          {/* 진행률 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">진행률</span>
              <span className="font-medium text-text dark:text-white">{project.progress}%</span>
            </div>
            <div className="h-2 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${status.gradient}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Icon name="group" size="xs" />
                <span>{memberCount}명</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon name="task" size="xs" />
                <span>{taskCount}</span>
              </div>
            </div>
            {project.endDate && (
              <div className="flex items-center gap-1">
                <Icon name="calendar_today" size="xs" />
                <span>{new Date(project.endDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * 프로젝트 리스트 아이템 컴포넌트 (리스트 뷰)
 */
function ProjectListItem({ project }: { project: Project }) {
  const status = statusConfig[project.status] || statusConfig.PLANNING;
  const taskCount = project._count?.tasks || 0;
  const memberCount = project.teamMembers?.length || 0;

  return (
    <Link href={`/dashboard/wbs?project=${project.id}`}>
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer group">
        <div className="flex items-center gap-6">
          {/* 색상 표시 */}
          <div className={`w-1 h-16 rounded-full bg-gradient-to-b ${status.gradient}`} />

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-text dark:text-white group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-text-secondary truncate">{project.description || "설명 없음"}</p>
          </div>

          {/* 진행률 */}
          <div className="w-32 hidden sm:block">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">진행률</span>
              <span className="font-medium text-text dark:text-white">{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${status.gradient}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <div className="flex items-center gap-1 hidden md:flex">
              <Icon name="group" size="xs" />
              <span>{memberCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="task" size="xs" />
              <span>{taskCount}</span>
            </div>
            <Icon name="chevron_right" size="sm" className="text-text-secondary group-hover:text-primary" />
          </div>
        </div>
      </div>
    </Link>
  );
}
