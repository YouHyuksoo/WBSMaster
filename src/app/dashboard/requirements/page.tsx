/**
 * @file src/app/dashboard/requirements/page.tsx
 * @description
 * 요구사항 점검표 페이지입니다.
 * 프로젝트 요구사항을 체크리스트 형태로 관리합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **카테고리**: 요구사항을 기능별로 그룹화
 * 2. **체크박스**: 완료 여부 표시
 * 3. **우선순위**: MUST/SHOULD/COULD/WONT 구분
 *
 * 수정 방법:
 * - 요구사항 추가: useCreateRequirement hook 사용
 * - 요구사항 수정: useUpdateRequirement hook 사용
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import {
  useRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useMembers,
} from "@/hooks";
import { useProject } from "@/contexts";
import type { Requirement } from "@/lib/api";

/** 우선순위 설정 */
const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  MUST: { label: "필수", color: "text-error", bgColor: "bg-error/10" },
  SHOULD: { label: "중요", color: "text-warning", bgColor: "bg-warning/10" },
  COULD: { label: "선택", color: "text-primary", bgColor: "bg-primary/10" },
  WONT: { label: "보류", color: "text-text-secondary", bgColor: "bg-surface" },
};

/** 상태 설정 */
const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  DRAFT: { label: "초안", icon: "edit_note", color: "text-text-secondary" },
  APPROVED: { label: "승인", icon: "check_circle", color: "text-success" },
  REJECTED: { label: "반려", icon: "cancel", color: "text-error" },
  IMPLEMENTED: { label: "구현완료", icon: "done_all", color: "text-primary" },
};

/**
 * 요구사항 점검표 페이지
 */
export default function RequirementsPage() {
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);

  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  /** 요구사항 목록 조회 (프로젝트 필터링) */
  const { data: requirements = [], isLoading, error } = useRequirements(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 요구사항 생성 */
  const createRequirement = useCreateRequirement();

  /** 요구사항 수정 */
  const updateRequirement = useUpdateRequirement();

  /** 프로젝트 팀 멤버 목록 조회 */
  const { data: teamMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 새 요구사항 폼 상태 */
  const [newRequirement, setNewRequirement] = useState({
    title: "",
    description: "",
    priority: "SHOULD",
    category: "",
    dueDate: "",
  });

  // 카테고리 목록 추출
  const categories = [...new Set(requirements.map((r) => r.category).filter(Boolean))];

  // 필터링된 요구사항
  const filteredRequirements = requirements.filter((req) => {
    const matchesPriority = filterPriority === "all" || req.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesStatus && matchesSearch;
  });

  // 통계 계산
  const stats = {
    total: requirements.length,
    approved: requirements.filter((r) => r.status === "APPROVED").length,
    implemented: requirements.filter((r) => r.status === "IMPLEMENTED").length,
    draft: requirements.filter((r) => r.status === "DRAFT").length,
  };

  /**
   * 상태 토글 (DRAFT -> APPROVED -> IMPLEMENTED)
   */
  const toggleStatus = async (id: string, currentStatus: string) => {
    const statusOrder = ["DRAFT", "APPROVED", "IMPLEMENTED"] as const;
    const currentIndex = statusOrder.indexOf(currentStatus as typeof statusOrder[number]);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    await updateRequirement.mutateAsync({
      id,
      data: { status: nextStatus },
    });
  };

  /**
   * 요구사항 수정 핸들러
   */
  const handleEditRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequirement) return;

    await updateRequirement.mutateAsync({
      id: editingRequirement.id,
      data: {
        title: editingRequirement.title,
        description: editingRequirement.description,
        priority: editingRequirement.priority,
        category: editingRequirement.category || undefined,
        status: editingRequirement.status,
        dueDate: editingRequirement.dueDate || undefined,
        requesterId: editingRequirement.requesterId || undefined,
        assigneeId: editingRequirement.assigneeId || undefined,
      },
    });

    setEditingRequirement(null);
  };

  /**
   * 요구사항 생성 핸들러
   */
  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    if (!newRequirement.title.trim()) return;

    await createRequirement.mutateAsync({
      title: newRequirement.title,
      description: newRequirement.description,
      priority: newRequirement.priority,
      category: newRequirement.category || undefined,
      dueDate: newRequirement.dueDate || undefined,
      projectId: selectedProjectId,
    });

    setNewRequirement({ title: "", description: "", priority: "SHOULD", category: "", dueDate: "" });
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
          <h1 className="text-2xl font-bold text-text dark:text-white">요구사항 점검표</h1>
          <p className="text-text-secondary mt-1">
            프로젝트 요구사항을 체크리스트로 관리합니다
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
            요구사항 추가
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
            상단 헤더에서 프로젝트를 선택하면 요구사항 목록이 표시됩니다.
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
                  <Icon name="checklist" size="sm" className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.total}</p>
                  <p className="text-xs text-text-secondary">전체</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Icon name="check_circle" size="sm" className="text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.approved}</p>
                  <p className="text-xs text-text-secondary">승인</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="done_all" size="sm" className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.implemented}</p>
                  <p className="text-xs text-text-secondary">구현완료</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-text-secondary/10 flex items-center justify-center">
                  <Icon name="edit_note" size="sm" className="text-text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text dark:text-white">{stats.draft}</p>
                  <p className="text-xs text-text-secondary">초안</p>
                </div>
              </div>
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">구현 진행률</span>
              <span className="font-medium text-text dark:text-white">
                {stats.total > 0 ? Math.round((stats.implemented / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="h-3 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
                style={{ width: stats.total > 0 ? `${(stats.implemented / stats.total) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="요구사항 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 우선순위</option>
              <option value="MUST">필수</option>
              <option value="SHOULD">중요</option>
              <option value="COULD">선택</option>
              <option value="WONT">보류</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 상태</option>
              <option value="DRAFT">초안</option>
              <option value="APPROVED">승인</option>
              <option value="IMPLEMENTED">구현완료</option>
              <option value="REJECTED">반려</option>
            </select>
          </div>

          {/* 요구사항 목록 */}
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
            {/* 테이블 헤더 */}
            <div
              className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1250px]"
              style={{ gridTemplateColumns: "50px 80px 1fr 70px 100px 100px 100px 80px 90px 100px 50px" }}
            >
              <div>상태</div>
              <div>코드</div>
              <div>요구사항</div>
              <div>우선순위</div>
              <div>카테고리</div>
              <div>요청자</div>
              <div>담당자</div>
              <div>요청일</div>
              <div>마감일</div>
              <div>연결 태스크</div>
              <div>수정</div>
            </div>

            {/* 빈 목록 */}
            {filteredRequirements.length === 0 && (
              <div className="p-8 text-center">
                <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
                <p className="text-text-secondary">
                  {requirements.length === 0
                    ? "등록된 요구사항이 없습니다."
                    : "검색 조건에 맞는 요구사항이 없습니다."}
                </p>
              </div>
            )}

            {/* 요구사항 목록 */}
            {filteredRequirements.map((req) => {
              const priority = priorityConfig[req.priority] || priorityConfig.SHOULD;
              const status = statusConfig[req.status] || statusConfig.DRAFT;

              // 날짜 포맷팅
              const formatDate = (dateStr?: string) => {
                if (!dateStr) return "-";
                const date = new Date(dateStr);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              };

              return (
                <div
                  key={req.id}
                  className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1250px]"
                  style={{ gridTemplateColumns: "50px 80px 1fr 70px 100px 100px 100px 80px 90px 100px 50px" }}
                >
                  {/* 체크박스 */}
                  <div>
                    <button
                      onClick={() => toggleStatus(req.id, req.status)}
                      className={`size-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        req.status === "IMPLEMENTED"
                          ? "bg-success border-success text-white"
                          : req.status === "APPROVED"
                          ? "bg-primary border-primary text-white"
                          : "border-border dark:border-border-dark hover:border-primary"
                      }`}
                    >
                      {(req.status === "IMPLEMENTED" || req.status === "APPROVED") && (
                        <Icon name="check" size="xs" />
                      )}
                    </button>
                  </div>

                  {/* 코드 */}
                  <div>
                    <span className="text-xs text-text-secondary font-mono">
                      {req.code || `REQ-${req.id.slice(0, 6)}`}
                    </span>
                  </div>

                  {/* 제목 */}
                  <div>
                    <p
                      className={`text-sm font-medium truncate ${
                        req.status === "IMPLEMENTED"
                          ? "text-text-secondary line-through"
                          : "text-text dark:text-white"
                      }`}
                    >
                      {req.title}
                    </p>
                    {req.description && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                        {req.description}
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
                    <span className="text-xs text-text-secondary bg-surface dark:bg-background-dark px-2 py-1 rounded truncate block">
                      {req.category || "-"}
                    </span>
                  </div>

                  {/* 요청자 */}
                  <div>
                    <div className="flex items-center gap-1">
                      {req.requester?.avatar ? (
                        <img
                          src={req.requester.avatar}
                          alt={req.requester.name || ""}
                          className="size-5 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-primary font-medium">
                            {req.requester?.name?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-text dark:text-white truncate">
                        {req.requester?.name || "-"}
                      </span>
                    </div>
                  </div>

                  {/* 담당자 */}
                  <div>
                    <div className="flex items-center gap-1">
                      {req.assignee?.avatar ? (
                        <img
                          src={req.assignee.avatar}
                          alt={req.assignee.name || ""}
                          className="size-5 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-success font-medium">
                            {req.assignee?.name?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-text dark:text-white truncate">
                        {req.assignee?.name || "-"}
                      </span>
                    </div>
                  </div>

                  {/* 요청일 */}
                  <div>
                    <span className="text-xs text-text-secondary">
                      {formatDate(req.requestDate)}
                    </span>
                  </div>

                  {/* 마감일 */}
                  <div>
                    <span className={`text-xs ${req.isDelayed ? "text-error font-medium" : "text-text-secondary"}`}>
                      {formatDate(req.dueDate)}
                      {req.isDelayed && " (지연)"}
                    </span>
                  </div>

                  {/* 연결된 태스크 */}
                  <div>
                    {req._count?.tasks && req._count.tasks > 0 ? (
                      <div className="relative group">
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                          <Icon name="task_alt" size="xs" />
                          <span>{req._count.tasks}개</span>
                        </div>
                        {/* 호버 시 태스크 목록 표시 */}
                        {req.tasks && req.tasks.length > 0 && (
                          <div className="absolute z-20 left-0 top-full mt-1 w-64 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-2 hidden group-hover:block">
                            <p className="text-xs font-semibold text-text dark:text-white mb-2">연결된 태스크</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {req.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 p-1.5 rounded bg-surface dark:bg-background-dark"
                                >
                                  <span className={`size-2 rounded-full ${
                                    task.status === "COMPLETED" ? "bg-success" :
                                    task.status === "IN_PROGRESS" ? "bg-primary" :
                                    task.status === "HOLDING" ? "bg-amber-500" :
                                    task.status === "CANCELLED" ? "bg-red-500" :
                                    "bg-slate-400"
                                  }`} />
                                  <span className="text-xs text-text dark:text-white truncate flex-1">
                                    {task.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary">-</span>
                    )}
                  </div>

                  {/* 수정 버튼 */}
                  <div>
                    <button
                      onClick={() => setEditingRequirement(req)}
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

      {/* 요구사항 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              새 요구사항 추가
            </h2>
            <form onSubmit={handleCreateRequirement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  제목 *
                </label>
                <Input
                  value={newRequirement.title}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, title: e.target.value })
                  }
                  placeholder="요구사항 제목"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={newRequirement.description}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, description: e.target.value })
                  }
                  placeholder="요구사항 상세 설명"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-text-secondary resize-none h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    우선순위
                  </label>
                  <select
                    value={newRequirement.priority}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="MUST">필수</option>
                    <option value="SHOULD">중요</option>
                    <option value="COULD">선택</option>
                    <option value="WONT">보류</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    카테고리
                  </label>
                  <select
                    value={newRequirement.category}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="">선택 안함</option>
                    <option value="인증/보안">인증/보안</option>
                    <option value="UI/UX">UI/UX</option>
                    <option value="API">API</option>
                    <option value="데이터베이스">데이터베이스</option>
                    <option value="성능">성능</option>
                    <option value="알림">알림</option>
                    <option value="통합">통합</option>
                    <option value="문서화">문서화</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  마감일
                </label>
                <input
                  type="date"
                  value={newRequirement.dueDate}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
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
                  disabled={createRequirement.isPending}
                >
                  {createRequirement.isPending ? "생성 중..." : "생성"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 요구사항 수정 모달 */}
      {editingRequirement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              요구사항 수정
            </h2>
            <form onSubmit={handleEditRequirement} className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  제목 *
                </label>
                <Input
                  value={editingRequirement.title}
                  onChange={(e) =>
                    setEditingRequirement({ ...editingRequirement, title: e.target.value })
                  }
                  placeholder="요구사항 제목"
                  required
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  설명
                </label>
                <textarea
                  value={editingRequirement.description || ""}
                  onChange={(e) =>
                    setEditingRequirement({ ...editingRequirement, description: e.target.value })
                  }
                  placeholder="요구사항 상세 설명"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-text-secondary resize-none h-24"
                />
              </div>

              {/* 상태 & 우선순위 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    상태
                  </label>
                  <select
                    value={editingRequirement.status}
                    onChange={(e) =>
                      setEditingRequirement({ ...editingRequirement, status: e.target.value as Requirement["status"] })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="DRAFT">초안</option>
                    <option value="APPROVED">승인</option>
                    <option value="REJECTED">반려</option>
                    <option value="IMPLEMENTED">구현완료</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    우선순위
                  </label>
                  <select
                    value={editingRequirement.priority}
                    onChange={(e) =>
                      setEditingRequirement({ ...editingRequirement, priority: e.target.value as Requirement["priority"] })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="MUST">필수</option>
                    <option value="SHOULD">중요</option>
                    <option value="COULD">선택</option>
                    <option value="WONT">보류</option>
                  </select>
                </div>
              </div>

              {/* 카테고리 & 마감일 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    카테고리
                  </label>
                  <select
                    value={editingRequirement.category || ""}
                    onChange={(e) =>
                      setEditingRequirement({ ...editingRequirement, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
                  >
                    <option value="">선택 안함</option>
                    <option value="인증/보안">인증/보안</option>
                    <option value="UI/UX">UI/UX</option>
                    <option value="API">API</option>
                    <option value="데이터베이스">데이터베이스</option>
                    <option value="성능">성능</option>
                    <option value="알림">알림</option>
                    <option value="통합">통합</option>
                    <option value="문서화">문서화</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={editingRequirement.dueDate ? editingRequirement.dueDate.split("T")[0] : ""}
                    onChange={(e) =>
                      setEditingRequirement({ ...editingRequirement, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
                  />
                </div>
              </div>

              {/* 요청자 & 담당자 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    요청자
                  </label>
                  <select
                    value={editingRequirement.requesterId || ""}
                    onChange={(e) =>
                      setEditingRequirement({ ...editingRequirement, requesterId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
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
                    value={editingRequirement.assigneeId || ""}
                    onChange={(e) =>
                      setEditingRequirement({ ...editingRequirement, assigneeId: e.target.value || undefined })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
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
                  onClick={() => setEditingRequirement(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={updateRequirement.isPending}
                >
                  {updateRequirement.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
