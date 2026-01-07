/**
 * @file src/app/dashboard/wbs/page.tsx
 * @description
 * WBS(Work Breakdown Structure) 보기 페이지입니다.
 * 작업 목록과 간트 차트를 통합하여 프로젝트 일정을 시각화합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **Task List**: 좌측 패널에 작업 목록 표시
 * 2. **Gantt Chart**: 우측 패널에 타임라인 기반 간트 차트
 * 3. **View Toggle**: 리스트/간트 뷰 전환
 *
 * 수정 방법:
 * - 프로젝트 선택: selectedProjectId 변경
 * - 뷰 전환: viewType 상태 변경
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon, Button, Input } from "@/components/ui";
import { useProjects, useTasks, useCreateTask } from "@/hooks";
import type { Task } from "@/lib/api";

/** 뷰 타입 */
type ViewType = "list" | "gantt";

/** 날짜 생성 헬퍼 */
const generateDates = (startDate: Date, days: number) => {
  const dates = [];
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push({
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      dayName: dayNames[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: isSameDay(date, new Date()),
    });
  }
  return dates;
};

/** 같은 날인지 확인 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** 우선순위별 색상 */
const priorityColors: Record<string, string> = {
  HIGH: "bg-error",
  MEDIUM: "bg-warning",
  LOW: "bg-success",
};

/** 상태별 색상 */
const statusColors: Record<string, string> = {
  PENDING: "bg-text-secondary",
  IN_PROGRESS: "bg-primary",
  COMPLETED: "bg-success",
};

/**
 * WBS 페이지 컴포넌트
 */
export default function WBSPage() {
  const [viewType, setViewType] = useState<ViewType>("gantt");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
  });

  /** 프로젝트 목록 조회 */
  const { data: projects = [] } = useProjects();

  /** 태스크 목록 조회 */
  const { data: tasks = [], isLoading, error } = useTasks(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 태스크 생성 */
  const createTask = useCreateTask();

  // 30일 날짜 범위 생성 (오늘부터)
  const startDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7일 전부터 시작
    return date;
  }, []);
  const dates = useMemo(() => generateDates(startDate, 45), [startDate]);

  // 오늘 인덱스 찾기
  const todayIndex = dates.findIndex((d) => d.isToday);

  // 통계 계산
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
    progress:
      tasks.length > 0
        ? Math.round(
            (tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100
          )
        : 0,
  };

  /**
   * 태스크의 시작일과 종료일 계산 (간트 차트용)
   */
  const getTaskPosition = (task: Task) => {
    const taskCreated = new Date(task.createdAt);
    const taskDue = task.dueDate ? new Date(task.dueDate) : new Date(taskCreated);
    taskDue.setDate(taskDue.getDate() + 7); // 기본 7일

    // 시작일 인덱스
    let startIndex = dates.findIndex(
      (d) =>
        d.date.getFullYear() === taskCreated.getFullYear() &&
        d.date.getMonth() === taskCreated.getMonth() &&
        d.date.getDate() === taskCreated.getDate()
    );
    if (startIndex < 0) startIndex = 0;

    // 종료일 인덱스
    let endIndex = dates.findIndex(
      (d) =>
        d.date.getFullYear() === taskDue.getFullYear() &&
        d.date.getMonth() === taskDue.getMonth() &&
        d.date.getDate() === taskDue.getDate()
    );
    if (endIndex < 0 || endIndex <= startIndex) endIndex = Math.min(startIndex + 5, dates.length - 1);

    return { startIndex, endIndex };
  };

  /**
   * 태스크 생성 핸들러
   */
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newTask.title.trim()) return;

    await createTask.mutateAsync({
      title: newTask.title,
      description: newTask.description,
      projectId: selectedProjectId,
      priority: newTask.priority,
      dueDate: newTask.dueDate || undefined,
    });

    setNewTask({ title: "", description: "", priority: "MEDIUM", dueDate: "" });
    setShowAddModal(false);
  };

  /** 로딩 상태 */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /** 에러 상태 */
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-4 rounded-lg">
          데이터를 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background dark:bg-background-dark">
      {/* 상단 툴바 */}
      <div className="h-14 border-b border-border dark:border-border-dark flex items-center justify-between px-6 bg-background-white dark:bg-surface-dark shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-text dark:text-white">WBS 보기</h1>
          <div className="h-6 w-px bg-border dark:bg-border-dark" />

          {/* 프로젝트 선택 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
          >
            <option value="">프로젝트 선택</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* 뷰 전환 */}
          <div className="flex bg-surface dark:bg-background-dark rounded-lg p-1 border border-border dark:border-border-dark">
            <button
              onClick={() => setViewType("list")}
              className={`p-1.5 rounded transition-colors ${
                viewType === "list"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-dark"
              }`}
              title="리스트 보기"
            >
              <Icon name="view_list" size="sm" />
            </button>
            <button
              onClick={() => setViewType("gantt")}
              className={`p-1.5 rounded transition-colors ${
                viewType === "gantt"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-dark"
              }`}
              title="간트 차트"
            >
              <Icon name="calendar_view_week" size="sm" />
            </button>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon="add"
          onClick={() => setShowAddModal(true)}
          disabled={!selectedProjectId}
        >
          작업 추가
        </Button>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="folder_open" size="xl" className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
              프로젝트를 선택해주세요
            </h3>
            <p className="text-text-secondary">
              WBS를 확인할 프로젝트를 선택하면 작업 목록과 간트 차트가 표시됩니다.
            </p>
          </div>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 프로젝트 상태 요약 */}
          <div className="p-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
            <div className="flex items-center gap-6">
              {/* 진행률 바 */}
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">전체 진행률</span>
                  <span className="font-medium text-text dark:text-white">{stats.progress}%</span>
                </div>
                <div className="h-2 bg-background dark:bg-background-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${stats.progress}%` }}
                  />
                </div>
              </div>

              {/* 통계 */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-success" />
                  <span className="text-xs text-text-secondary">완료</span>
                  <span className="text-sm font-bold text-text dark:text-white">
                    {stats.completed}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-primary" />
                  <span className="text-xs text-text-secondary">진행중</span>
                  <span className="text-sm font-bold text-text dark:text-white">
                    {stats.inProgress}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                  <div className="size-2 rounded-full bg-text-secondary" />
                  <span className="text-xs text-text-secondary">대기</span>
                  <span className="text-sm font-bold text-text dark:text-white">
                    {stats.pending}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          {tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
                  작업이 없습니다
                </h3>
                <p className="text-text-secondary mb-4">
                  새 작업을 추가하여 프로젝트를 시작해보세요.
                </p>
                <Button variant="primary" leftIcon="add" onClick={() => setShowAddModal(true)}>
                  작업 추가
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* 좌측: 작업 목록 */}
              <div className="w-[400px] flex-shrink-0 border-r border-border dark:border-border-dark flex flex-col bg-background-white dark:bg-background-dark">
                {/* 헤더 */}
                <div className="h-10 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center px-4 shrink-0">
                  <div className="w-1/2 text-xs font-semibold text-text-secondary uppercase">
                    작업명
                  </div>
                  <div className="w-1/4 text-xs font-semibold text-text-secondary uppercase text-center">
                    상태
                  </div>
                  <div className="w-1/4 text-xs font-semibold text-text-secondary uppercase text-center">
                    담당자
                  </div>
                </div>

                {/* 작업 목록 */}
                <div className="flex-1 overflow-y-auto">
                  {tasks.map((task) => {
                    const isSelected = selectedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`
                          h-12 border-b border-border dark:border-border-dark flex items-center px-4
                          cursor-pointer transition-colors
                          ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-surface dark:hover:bg-surface-dark"}
                        `}
                      >
                        <div className="w-1/2 flex items-center gap-2 overflow-hidden">
                          <span
                            className={`size-2 rounded-full ${priorityColors[task.priority] || priorityColors.MEDIUM}`}
                          />
                          <span
                            className={`text-sm truncate ${isSelected ? "text-primary font-medium" : "text-text dark:text-white"}`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="w-1/4 flex justify-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${statusColors[task.status]}`}
                          >
                            {task.status === "PENDING"
                              ? "대기"
                              : task.status === "IN_PROGRESS"
                              ? "진행"
                              : "완료"}
                          </span>
                        </div>
                        <div className="w-1/4 flex justify-center">
                          <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {task.assignee?.name?.charAt(0) || "?"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 하단 요약 */}
                <div className="h-10 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center justify-between px-4 text-xs text-text-secondary">
                  <span>{tasks.length}개 작업</span>
                  <Link
                    href={`/dashboard/kanban?projectId=${selectedProjectId}`}
                    className="text-primary hover:underline"
                  >
                    칸반 보드로 이동
                  </Link>
                </div>
              </div>

              {/* 우측: 간트 차트 */}
              {viewType === "gantt" && (
                <div className="flex-1 overflow-auto bg-background-white dark:bg-[#161b22]">
                  {/* 날짜 헤더 */}
                  <div className="h-10 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex sticky top-0 z-10">
                    {dates.map((date, index) => (
                      <div
                        key={index}
                        className={`
                          min-w-[40px] flex-shrink-0 border-r border-border dark:border-border-dark
                          flex flex-col items-center justify-center text-xs
                          ${date.isWeekend ? "bg-surface dark:bg-surface-dark/50" : ""}
                          ${date.isToday ? "bg-primary/10 text-primary font-bold" : "text-text-secondary"}
                        `}
                      >
                        <span>
                          {date.month}/{date.day}
                        </span>
                        <span className="text-[10px] opacity-70">{date.dayName}</span>
                      </div>
                    ))}
                  </div>

                  {/* 간트 바 영역 */}
                  <div className="relative" style={{ width: `${dates.length * 40}px` }}>
                    {/* 그리드 라인 */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {dates.map((date, index) => (
                        <div
                          key={index}
                          className={`
                            min-w-[40px] flex-shrink-0 border-r border-border/30 dark:border-border-dark/30
                            ${date.isWeekend ? "bg-surface/50 dark:bg-surface-dark/30" : ""}
                            ${date.isToday ? "bg-primary/5" : ""}
                          `}
                          style={{ height: `${tasks.length * 48}px` }}
                        />
                      ))}
                    </div>

                    {/* 오늘 표시선 */}
                    {todayIndex >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-error z-10"
                        style={{
                          left: `${todayIndex * 40 + 20}px`,
                          height: `${tasks.length * 48}px`,
                        }}
                      >
                        <div className="absolute -top-1 -left-1 size-2 rounded-full bg-error" />
                      </div>
                    )}

                    {/* 간트 바 */}
                    {tasks.map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      const { startIndex, endIndex } = getTaskPosition(task);
                      const barWidth = (endIndex - startIndex + 1) * 40 - 8;
                      const barLeft = startIndex * 40 + 4;
                      const progress =
                        task.status === "COMPLETED"
                          ? 100
                          : task.status === "IN_PROGRESS"
                          ? 50
                          : 0;

                      return (
                        <div
                          key={task.id}
                          className="h-12 border-b border-border/30 dark:border-border-dark/30 relative flex items-center"
                        >
                          <div
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`
                              absolute h-7 rounded-md cursor-pointer transition-all
                              ${priorityColors[task.priority] || "bg-primary"}
                              ${isSelected ? "ring-2 ring-white shadow-lg" : "hover:brightness-110"}
                            `}
                            style={{
                              left: `${barLeft}px`,
                              width: `${barWidth}px`,
                            }}
                          >
                            {/* 진행률 표시 */}
                            <div
                              className="absolute inset-y-0 left-0 bg-black/20 rounded-l-md"
                              style={{ width: `${progress}%` }}
                            />
                            {/* 작업명 */}
                            <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                              {barWidth > 80 ? task.title : ""}
                            </span>
                            {/* 진행률 텍스트 */}
                            {barWidth > 50 && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/80">
                                {progress}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 리스트 뷰 */}
              {viewType === "list" && (
                <div className="flex-1 overflow-auto p-4 bg-background-white dark:bg-background-dark">
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-text dark:text-white">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-text-secondary mt-1">{task.description}</p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium text-white ${statusColors[task.status]}`}
                          >
                            {task.status === "PENDING"
                              ? "대기"
                              : task.status === "IN_PROGRESS"
                              ? "진행중"
                              : "완료"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
                          <span>우선순위: {task.priority}</span>
                          {task.dueDate && (
                            <span>마감일: {new Date(task.dueDate).toLocaleDateString("ko-KR")}</span>
                          )}
                          <span>담당자: {task.assignee?.name || "미지정"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 작업 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">새 작업 추가</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  작업명 *
                </label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="작업명을 입력하세요"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="작업 설명"
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    우선순위
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="LOW">낮음</option>
                    <option value="MEDIUM">중간</option>
                    <option value="HIGH">높음</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? "추가 중..." : "추가"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
