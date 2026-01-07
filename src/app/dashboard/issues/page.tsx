/**
 * @file src/app/dashboard/issues/page.tsx
 * @description
 * 이슈사항 점검표 페이지입니다.
 * 프로젝트 이슈를 체크리스트 형태로 관리합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **카테고리**: 이슈를 유형별로 그룹화 (버그, 개선, 문의 등)
 * 2. **상태**: OPEN/IN_PROGRESS/RESOLVED/CLOSED 구분
 * 3. **우선순위**: CRITICAL/HIGH/MEDIUM/LOW 구분
 *
 * 수정 방법:
 * - 이슈 추가: useCreateIssue hook 사용
 * - 이슈 수정: useUpdateIssue hook 사용
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import {
  useIssues,
  useCreateIssue,
  useUpdateIssue,
  useMembers,
} from "@/hooks";
import { useProject } from "@/contexts";
import type { Issue } from "@/lib/api";

/** 우선순위 설정 */
const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CRITICAL: { label: "긴급", color: "text-error", bgColor: "bg-error/10" },
  HIGH: { label: "높음", color: "text-warning", bgColor: "bg-warning/10" },
  MEDIUM: { label: "보통", color: "text-primary", bgColor: "bg-primary/10" },
  LOW: { label: "낮음", color: "text-text-secondary", bgColor: "bg-surface" },
};

/** 상태 설정 */
const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  OPEN: { label: "열림", icon: "radio_button_unchecked", color: "text-error" },
  IN_PROGRESS: { label: "진행중", icon: "pending", color: "text-warning" },
  RESOLVED: { label: "해결됨", icon: "check_circle", color: "text-success" },
  CLOSED: { label: "종료", icon: "done_all", color: "text-primary" },
  WONT_FIX: { label: "수정안함", icon: "block", color: "text-text-secondary" },
};

/** 카테고리 설정 */
const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  BUG: { label: "버그", icon: "bug_report", color: "text-error" },
  IMPROVEMENT: { label: "개선", icon: "trending_up", color: "text-primary" },
  QUESTION: { label: "문의", icon: "help", color: "text-warning" },
  FEATURE: { label: "신규기능", icon: "add_circle", color: "text-success" },
  DOCUMENTATION: { label: "문서", icon: "description", color: "text-info" },
  OTHER: { label: "기타", icon: "more_horiz", color: "text-text-secondary" },
};

/**
 * 이슈사항 점검표 페이지
 */
export default function IssuesPage() {
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  /** 이슈 목록 조회 (프로젝트 필터링) */
  const { data: issues = [], isLoading, error } = useIssues(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 이슈 생성 */
  const createIssue = useCreateIssue();

  /** 이슈 수정 */
  const updateIssue = useUpdateIssue();

  /** 프로젝트 팀 멤버 목록 조회 */
  const { data: teamMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 새 이슈 폼 상태 */
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "BUG",
    dueDate: "",
  });

  // 필터링된 이슈
  const filteredIssues = issues.filter((issue) => {
    const matchesPriority = filterPriority === "all" || issue.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || issue.status === filterStatus;
    const matchesCategory = filterCategory === "all" || issue.category === filterCategory;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesStatus && matchesCategory && matchesSearch;
  });

  // 통계 계산
  const stats = {
    total: issues.length,
    open: issues.filter((i) => i.status === "OPEN").length,
    inProgress: issues.filter((i) => i.status === "IN_PROGRESS").length,
    resolved: issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length,
  };

  /**
   * 상태 토글 (OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED)
   */
  const toggleStatus = async (id: string, currentStatus: string) => {
    const statusOrder = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
    const currentIndex = statusOrder.indexOf(currentStatus as typeof statusOrder[number]);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    await updateIssue.mutateAsync({
      id,
      data: { status: nextStatus },
    });
  };

  /**
   * 이슈 수정 핸들러
   */
  const handleEditIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIssue) return;

    await updateIssue.mutateAsync({
      id: editingIssue.id,
      data: {
        title: editingIssue.title,
        description: editingIssue.description,
        priority: editingIssue.priority,
        category: editingIssue.category,
        status: editingIssue.status,
        dueDate: editingIssue.dueDate || undefined,
        reporterId: editingIssue.reporterId || undefined,
        assigneeId: editingIssue.assigneeId || undefined,
      },
    });

    setEditingIssue(null);
  };

  /**
   * 이슈 생성 핸들러
   */
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    if (!newIssue.title.trim()) return;

    await createIssue.mutateAsync({
      title: newIssue.title,
      description: newIssue.description,
      priority: newIssue.priority,
      category: newIssue.category,
      dueDate: newIssue.dueDate || undefined,
      projectId: selectedProjectId,
    });

    setNewIssue({ title: "", description: "", priority: "MEDIUM", category: "BUG", dueDate: "" });
    setShowModal(false);
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
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-white">이슈사항 점검표</h1>
          <p className="text-text-secondary mt-1">
            프로젝트 이슈를 등록하고 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 현재 선택된 프로젝트 표시 */}
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
            </div>
          )}
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowModal(true)}
            disabled={!selectedProjectId}
          >
            이슈 등록
          </Button>
        </div>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <Icon name="folder_open" size="xl" className="text-primary mb-4" />
          <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
            프로젝트를 선택해주세요
          </h3>
          <p className="text-text-secondary">
            상단 헤더에서 프로젝트를 선택하면 이슈 목록이 표시됩니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="bug_report" size="sm" className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.total}</p>
                  <p className="text-xs text-text-secondary">전체</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-error/10 flex items-center justify-center">
                  <Icon name="radio_button_unchecked" size="sm" className="text-error" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.open}</p>
                  <p className="text-xs text-text-secondary">열림</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Icon name="pending" size="sm" className="text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.inProgress}</p>
                  <p className="text-xs text-text-secondary">진행중</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Icon name="check_circle" size="sm" className="text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.resolved}</p>
                  <p className="text-xs text-text-secondary">해결됨</p>
                </div>
              </div>
            </div>
          </div>

          {/* 해결률 바 */}
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">해결률</span>
              <span className="font-medium text-text dark:text-white">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="h-3 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
                style={{ width: stats.total > 0 ? `${(stats.resolved / stats.total) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="이슈 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="all">전체 우선순위</option>
              <option value="CRITICAL">긴급</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">보통</option>
              <option value="LOW">낮음</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="all">전체 상태</option>
              <option value="OPEN">열림</option>
              <option value="IN_PROGRESS">진행중</option>
              <option value="RESOLVED">해결됨</option>
              <option value="CLOSED">종료</option>
              <option value="WONT_FIX">수정안함</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="all">전체 카테고리</option>
              <option value="BUG">버그</option>
              <option value="IMPROVEMENT">개선</option>
              <option value="QUESTION">문의</option>
              <option value="FEATURE">신규기능</option>
              <option value="DOCUMENTATION">문서</option>
              <option value="OTHER">기타</option>
            </select>
          </div>

          {/* 이슈 목록 */}
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
            {/* 테이블 헤더 */}
            <div
              className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1100px]"
              style={{ gridTemplateColumns: "50px 80px 1fr 80px 80px 100px 100px 80px 90px 50px" }}
            >
              <div>상태</div>
              <div>코드</div>
              <div>이슈</div>
              <div>우선순위</div>
              <div>카테고리</div>
              <div>보고자</div>
              <div>담당자</div>
              <div>보고일</div>
              <div>목표일</div>
              <div>수정</div>
            </div>

            {/* 빈 목록 */}
            {filteredIssues.length === 0 && (
              <div className="p-8 text-center">
                <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
                <p className="text-text-secondary">
                  {issues.length === 0
                    ? "등록된 이슈가 없습니다."
                    : "검색 조건에 맞는 이슈가 없습니다."}
                </p>
              </div>
            )}

            {/* 이슈 목록 */}
            {filteredIssues.map((issue) => {
              const priority = priorityConfig[issue.priority] || priorityConfig.MEDIUM;
              const status = statusConfig[issue.status] || statusConfig.OPEN;
              const category = categoryConfig[issue.category] || categoryConfig.OTHER;

              // 날짜 포맷팅
              const formatDate = (dateStr?: string) => {
                if (!dateStr) return "-";
                const date = new Date(dateStr);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              };

              return (
                <div
                  key={issue.id}
                  className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1100px]"
                  style={{ gridTemplateColumns: "50px 80px 1fr 80px 80px 100px 100px 80px 90px 50px" }}
                >
                  {/* 상태 버튼 */}
                  <div>
                    <button
                      onClick={() => toggleStatus(issue.id, issue.status)}
                      className={`size-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        issue.status === "CLOSED" || issue.status === "RESOLVED"
                          ? "bg-success border-success text-white"
                          : issue.status === "IN_PROGRESS"
                          ? "bg-warning border-warning text-white"
                          : "border-border dark:border-border-dark hover:border-primary"
                      }`}
                      title={status.label}
                    >
                      {(issue.status === "CLOSED" || issue.status === "RESOLVED") && (
                        <Icon name="check" size="xs" />
                      )}
                      {issue.status === "IN_PROGRESS" && (
                        <Icon name="more_horiz" size="xs" />
                      )}
                    </button>
                  </div>

                  {/* 코드 */}
                  <div>
                    <span className="text-xs text-text-secondary font-mono">
                      {issue.code || `ISS-${issue.id.slice(0, 6)}`}
                    </span>
                  </div>

                  {/* 제목 */}
                  <div>
                    <p
                      className={`text-sm font-medium truncate ${
                        issue.status === "CLOSED" || issue.status === "RESOLVED"
                          ? "text-text-secondary line-through"
                          : "text-text dark:text-white"
                      }`}
                    >
                      {issue.title}
                    </p>
                    {issue.description && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                        {issue.description}
                      </p>
                    )}
                  </div>

                  {/* 우선순위 */}
                  <div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${priority.bgColor} ${priority.color}`}
                    >
                      {priority.label}
                    </span>
                  </div>

                  {/* 카테고리 */}
                  <div>
                    <div className="flex items-center gap-1">
                      <Icon name={category.icon} size="xs" className={category.color} />
                      <span className={`text-xs ${category.color}`}>
                        {category.label}
                      </span>
                    </div>
                  </div>

                  {/* 보고자 */}
                  <div>
                    <div className="flex items-center gap-1">
                      {issue.reporter?.avatar ? (
                        <img
                          src={issue.reporter.avatar}
                          alt={issue.reporter.name || ""}
                          className="size-5 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-primary font-medium">
                            {issue.reporter?.name?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-text dark:text-white truncate">
                        {issue.reporter?.name || "-"}
                      </span>
                    </div>
                  </div>

                  {/* 담당자 */}
                  <div>
                    <div className="flex items-center gap-1">
                      {issue.assignee?.avatar ? (
                        <img
                          src={issue.assignee.avatar}
                          alt={issue.assignee.name || ""}
                          className="size-5 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-success font-medium">
                            {issue.assignee?.name?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-text dark:text-white truncate">
                        {issue.assignee?.name || "-"}
                      </span>
                    </div>
                  </div>

                  {/* 보고일 */}
                  <div>
                    <span className="text-xs text-text-secondary">
                      {formatDate(issue.reportDate)}
                    </span>
                  </div>

                  {/* 목표일 */}
                  <div>
                    <span className={`text-xs ${issue.isDelayed ? "text-error font-medium" : "text-text-secondary"}`}>
                      {formatDate(issue.dueDate)}
                      {issue.isDelayed && " (지연)"}
                    </span>
                  </div>

                  {/* 수정 버튼 */}
                  <div>
                    <button
                      onClick={() => setEditingIssue(issue)}
                      className="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                      title="수정"
                    >
                      <Icon name="edit" size="xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 이슈 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              새 이슈 등록
            </h2>
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  제목 *
                </label>
                <Input
                  value={newIssue.title}
                  onChange={(e) =>
                    setNewIssue({ ...newIssue, title: e.target.value })
                  }
                  placeholder="이슈 제목"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={newIssue.description}
                  onChange={(e) =>
                    setNewIssue({ ...newIssue, description: e.target.value })
                  }
                  placeholder="이슈 상세 설명"
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary resize-none h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    우선순위
                  </label>
                  <select
                    value={newIssue.priority}
                    onChange={(e) =>
                      setNewIssue({ ...newIssue, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="CRITICAL">긴급</option>
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">보통</option>
                    <option value="LOW">낮음</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    카테고리
                  </label>
                  <select
                    value={newIssue.category}
                    onChange={(e) =>
                      setNewIssue({ ...newIssue, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="BUG">버그</option>
                    <option value="IMPROVEMENT">개선</option>
                    <option value="QUESTION">문의</option>
                    <option value="FEATURE">신규기능</option>
                    <option value="DOCUMENTATION">문서</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  목표 해결일
                </label>
                <input
                  type="date"
                  value={newIssue.dueDate}
                  onChange={(e) =>
                    setNewIssue({ ...newIssue, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={createIssue.isPending}
                >
                  {createIssue.isPending ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 이슈 수정 모달 */}
      {editingIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              이슈 수정
            </h2>
            <form onSubmit={handleEditIssue} className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  제목 *
                </label>
                <Input
                  value={editingIssue.title}
                  onChange={(e) =>
                    setEditingIssue({ ...editingIssue, title: e.target.value })
                  }
                  placeholder="이슈 제목"
                  required
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={editingIssue.description || ""}
                  onChange={(e) =>
                    setEditingIssue({ ...editingIssue, description: e.target.value })
                  }
                  placeholder="이슈 상세 설명"
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary resize-none h-24"
                />
              </div>

              {/* 상태 & 우선순위 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    상태
                  </label>
                  <select
                    value={editingIssue.status}
                    onChange={(e) =>
                      setEditingIssue({ ...editingIssue, status: e.target.value as Issue["status"] })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="OPEN">열림</option>
                    <option value="IN_PROGRESS">진행중</option>
                    <option value="RESOLVED">해결됨</option>
                    <option value="CLOSED">종료</option>
                    <option value="WONT_FIX">수정안함</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    우선순위
                  </label>
                  <select
                    value={editingIssue.priority}
                    onChange={(e) =>
                      setEditingIssue({ ...editingIssue, priority: e.target.value as Issue["priority"] })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="CRITICAL">긴급</option>
                    <option value="HIGH">높음</option>
                    <option value="MEDIUM">보통</option>
                    <option value="LOW">낮음</option>
                  </select>
                </div>
              </div>

              {/* 카테고리 & 목표일 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    카테고리
                  </label>
                  <select
                    value={editingIssue.category}
                    onChange={(e) =>
                      setEditingIssue({ ...editingIssue, category: e.target.value as Issue["category"] })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="BUG">버그</option>
                    <option value="IMPROVEMENT">개선</option>
                    <option value="QUESTION">문의</option>
                    <option value="FEATURE">신규기능</option>
                    <option value="DOCUMENTATION">문서</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    목표 해결일
                  </label>
                  <input
                    type="date"
                    value={editingIssue.dueDate ? editingIssue.dueDate.split("T")[0] : ""}
                    onChange={(e) =>
                      setEditingIssue({ ...editingIssue, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  />
                </div>
              </div>

              {/* 보고자 & 담당자 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    보고자
                  </label>
                  <select
                    value={editingIssue.reporterId || ""}
                    onChange={(e) =>
                      setEditingIssue({ ...editingIssue, reporterId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="">선택 안함</option>
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user?.name || member.user?.email || "알 수 없음"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    담당자
                  </label>
                  <select
                    value={editingIssue.assigneeId || ""}
                    onChange={(e) =>
                      setEditingIssue({ ...editingIssue, assigneeId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                  >
                    <option value="">선택 안함</option>
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user?.name || member.user?.email || "알 수 없음"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingIssue(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={updateIssue.isPending}
                >
                  {updateIssue.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
