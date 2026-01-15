/**
 * @file src/app/dashboard/requirements/page.tsx
 * @description
 * 업무협조 점검표 페이지입니다.
 * 프로젝트 업무협조를 체크리스트 형태로 관리합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **카테고리**: 업무협조를 기능별로 그룹화
 * 2. **상태 배지**: 클릭 시 드롭다운으로 상태 변경 (초안/승인/반려/구현완료)
 * 3. **우선순위**: MUST/SHOULD/COULD/WONT 구분
 *
 * 수정 방법:
 * - 업무협조 추가: useCreateRequirement hook 사용
 * - 업무협조 수정: useUpdateRequirement hook 사용
 * - 상태 변경: handleStatusChange 함수 사용
 */

"use client";

import { useState } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button, Input, useToast } from "@/components/ui";
import {
  useRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useMembers,
} from "@/hooks";
import { useProject } from "@/contexts";
import type { Requirement } from "@/lib/api";
import { RequirementTable } from "./components";

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
 * 업무협조 점검표 페이지
 */
export default function RequirementsPage() {
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRequester, setFilterRequester] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  /** OneDrive 미리보기 모달 상태 */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** 현재 선택된 탭 (active: 활성 요구사항, implemented: 구현완료) */
  const [activeTab, setActiveTab] = useState<"active" | "implemented">("active");
  /** 페이지네이션 상태 */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  /** 삭제 확인 모달 상태 */
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string } | null>(null);

  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  const toast = useToast();

  /** 요구사항 목록 조회 (프로젝트 필터링) */
  const { data: requirements = [], isLoading, error, refetch: refetchRequirements } = useRequirements(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 요구사항 생성 */
  const createRequirement = useCreateRequirement();

  /** 요구사항 수정 */
  const updateRequirement = useUpdateRequirement();

  /** 요구사항 삭제 */
  const deleteRequirement = useDeleteRequirement();

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
    oneDriveLink: "",
    dueDate: "",
  });

  /**
   * OneDrive 링크를 임베드 가능한 URL로 변환
   * 공유 링크를 embed 형식으로 변환합니다.
   */
  const getEmbedUrl = (url: string): string => {
    if (!url) return "";
    // OneDrive 공유 링크를 embed 형식으로 변환
    // 예: https://1drv.ms/x/s!xxx -> embed 형식
    // 또는 직접 embed URL 사용
    if (url.includes("embed")) return url;
    if (url.includes("1drv.ms") || url.includes("onedrive.live.com") || url.includes("sharepoint.com")) {
      // action=embedview 파라미터 추가
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}action=embedview`;
    }
    return url;
  };

  // 카테고리 목록 추출
  const categories = [...new Set(requirements.map((r) => r.category).filter(Boolean))];

  // 탭별 요구사항 분리 (활성 vs 구현완료)
  const activeRequirements = requirements.filter((r) => r.status !== "IMPLEMENTED");
  const implementedRequirements = requirements.filter((r) => r.status === "IMPLEMENTED");

  // 현재 탭에 해당하는 요구사항 목록
  const tabRequirements = activeTab === "active" ? activeRequirements : implementedRequirements;

  // 필터링된 요구사항
  const filteredRequirements = tabRequirements.filter((req) => {
    const matchesPriority = filterPriority === "all" || req.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRequester = filterRequester === "all" || req.requesterId === filterRequester;
    const matchesAssignee = filterAssignee === "all" || req.assigneeId === filterAssignee;
    return matchesPriority && matchesStatus && matchesSearch && matchesRequester && matchesAssignee;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequirements = filteredRequirements.slice(startIndex, endIndex);

  // 통계 계산
  const stats = {
    total: requirements.length,
    approved: requirements.filter((r) => r.status === "APPROVED").length,
    implemented: requirements.filter((r) => r.status === "IMPLEMENTED").length,
    draft: requirements.filter((r) => r.status === "DRAFT").length,
  };

  /**
   * 상태 변경 (드롭다운에서 선택)
   * @param id 요구사항 ID
   * @param newStatus 변경할 상태
   */
  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateRequirement.mutateAsync({
      id,
      data: { status: newStatus as Requirement["status"] },
    });
  };

  /**
   * 삭제 확인 모달 열기
   * @param id 요구사항 ID
   * @param title 요구사항 제목 (확인 메시지용)
   */
  const handleDeleteRequirement = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, id, title });
  };

  /**
   * 실제 삭제 처리 (모달에서 확인 버튼 클릭 시)
   */
  const confirmDelete = async () => {
    if (!deleteModal) return;

    try {
      await deleteRequirement.mutateAsync(deleteModal.id);
      toast.success("요구사항이 삭제되었습니다.");
      setDeleteModal(null);
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
    }
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
        oneDriveLink: editingRequirement.oneDriveLink || undefined,
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
    console.log("[DEBUG] handleCreateRequirement 호출됨");
    console.log("[DEBUG] selectedProjectId:", selectedProjectId);
    console.log("[DEBUG] newRequirement:", newRequirement);

    if (!selectedProjectId) {
      toast.error("프로젝트를 먼저 선택해주세요.");
      return;
    }
    if (!newRequirement.title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    try {
      await createRequirement.mutateAsync({
        title: newRequirement.title,
        description: newRequirement.description,
        priority: newRequirement.priority,
        category: newRequirement.category || undefined,
        oneDriveLink: newRequirement.oneDriveLink || undefined,
        dueDate: newRequirement.dueDate || undefined,
        projectId: selectedProjectId,
      });

      toast.success("업무협조가 등록되었습니다.");
      setNewRequirement({ title: "", description: "", priority: "SHOULD", category: "", oneDriveLink: "", dueDate: "" });
      setShowModal(false);
    } catch (error) {
      console.error("[DEBUG] 생성 오류:", error);
      toast.error("업무협조 등록에 실패했습니다.");
    }
  };

  /**
   * 데이터 새로고침 핸들러
   * 캐시를 무시하고 최신 요구사항 데이터를 가져옵니다.
   */
  const handleRefresh = async () => {
    try {
      await refetchRequirements();
      toast.success("데이터가 업데이트되었습니다.");
    } catch (err) {
      console.error("새로고침 실패:", err);
      toast.error("데이터 업데이트에 실패했습니다.");
    }
  };

  /**
   * 엑셀 다운로드 핸들러
   */
  const handleExportToExcel = () => {
    if (filteredRequirements.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 변환
    const excelData = filteredRequirements.map((req) => ({
      "코드": req.code || `REQ-${req.id.slice(0, 6)}`,
      "제목": req.title,
      "상태": statusConfig[req.status]?.label || req.status,
      "우선순위": priorityConfig[req.priority]?.label || req.priority,
      "카테고리": req.category || "-",
      "요청자": req.requester?.name || req.requester?.email || "-",
      "담당자": req.assignee?.name || req.assignee?.email || "-",
      "요청일": req.requestDate ? new Date(req.requestDate).toLocaleDateString() : "-",
      "마감일": req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "-",
      "설명": req.description || "",
      "문서링크": req.oneDriveLink || "",
    }));

    // 워크시트 생성
    const worksheet = utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet["!cols"] = [
      { wch: 15 }, // 코드
      { wch: 40 }, // 제목
      { wch: 10 }, // 상태
      { wch: 10 }, // 우선순위
      { wch: 15 }, // 카테고리
      { wch: 15 }, // 요청자
      { wch: 15 }, // 담당자
      { wch: 12 }, // 요청일
      { wch: 12 }, // 마감일
      { wch: 50 }, // 설명
      { wch: 30 }, // 문서링크
    ];

    // 워크북 생성 및 파일 저장
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "업무협조");

    // 파일명 생성 (프로젝트명_업무협조_날짜)
    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_업무협조_${dateStr}.xlsx`);
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
      {/* 헤더 - 대시보드 차트 스타일 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="checklist" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              REQUIREMENTS
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 업무협조 점검표
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            프로젝트 업무협조를 체크리스트로 관리합니다
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
          {/* 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            disabled={!selectedProjectId || isLoading}
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${
              isLoading
                ? "bg-primary/10 text-primary cursor-wait"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary/30"
            }`}
            title="데이터 새로고침"
          >
            <Icon name={isLoading ? "sync" : "refresh"} size="sm" className={isLoading ? "animate-spin" : ""} />
          </button>
          <Button
            variant="outline"
            leftIcon="download"
            onClick={handleExportToExcel}
            disabled={!selectedProjectId || filteredRequirements.length === 0}
            className="hidden sm:flex"
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowModal(true)}
            disabled={!selectedProjectId}
          >
            업무협조 추가
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
            상단 헤더에서 프로젝트를 선택하면 업무협조 목록이 표시됩니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 구현 진행률 카드 */}
            <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="speed" size="xs" className="text-primary" />
                <span className="text-xs font-semibold text-primary">구현률</span>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {stats.total > 0 ? Math.round((stats.implemented / stats.total) * 100) : 0}%
              </p>
              <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
                  style={{ width: stats.total > 0 ? `${(stats.implemented / stats.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="checklist" size="xs" className="text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.total}</p>
                  <p className="text-[10px] text-text-secondary">전체</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Icon name="check_circle" size="xs" className="text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.approved}</p>
                  <p className="text-[10px] text-text-secondary">승인</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="done_all" size="xs" className="text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.implemented}</p>
                  <p className="text-[10px] text-text-secondary">구현완료</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-text-secondary/10 flex items-center justify-center">
                  <Icon name="edit_note" size="xs" className="text-text-secondary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.draft}</p>
                  <p className="text-[10px] text-text-secondary">초안</p>
                </div>
              </div>
            </div>
          </div>

          {/* 필터 - 검색창 + 탭 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="업무협조 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // 검색어 변경 시 첫 페이지로 이동
                }}
              />
            </div>
            {/* 탭 (검색창 뒤 배치) */}
            <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
              <button
                onClick={() => {
                  setActiveTab("active");
                  setFilterStatus("all");
                  setCurrentPage(1); // 탭 변경 시 첫 페이지로 이동
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "active"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <Icon name="pending_actions" size="xs" />
                <span>진행중</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === "active" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
                }`}>
                  {activeRequirements.length}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("implemented");
                  setFilterStatus("all");
                  setCurrentPage(1); // 탭 변경 시 첫 페이지로 이동
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "implemented"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <Icon name="task_alt" size="xs" />
                <span>구현완료</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === "implemented" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
                }`}>
                  {implementedRequirements.length}
                </span>
              </button>
            </div>
            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
              }}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 우선순위</option>
              <option value="MUST">필수</option>
              <option value="SHOULD">중요</option>
              <option value="COULD">선택</option>
              <option value="WONT">보류</option>
            </select>
            {/* 활성 탭에서만 상태 필터 표시 */}
            {activeTab === "active" && (
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
                }}
                className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
              >
                <option value="all">전체 상태</option>
                <option value="DRAFT">초안</option>
                <option value="APPROVED">승인</option>
                <option value="REJECTED">반려</option>
              </select>
            )}
            {/* 요청자 필터 */}
            <select
              value={filterRequester}
              onChange={(e) => {
                setFilterRequester(e.target.value);
                setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
              }}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 요청자</option>
              {teamMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || "알 수 없음"}
                </option>
              ))}
            </select>
            {/* 담당자 필터 */}
            <select
              value={filterAssignee}
              onChange={(e) => {
                setFilterAssignee(e.target.value);
                setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
              }}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 담당자</option>
              {teamMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || "알 수 없음"}
                </option>
              ))}
            </select>
          </div>

          {/* 요구사항 목록 (컴포넌트로 분리) */}
          <RequirementTable
            requirements={paginatedRequirements}
            totalCount={requirements.length}
            onEdit={setEditingRequirement}
            onDelete={handleDeleteRequirement}
            onStatusChange={handleStatusChange}
            onPreviewDocument={setPreviewUrl}
          />

          {/* 페이지네이션 */}
          {filteredRequirements.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl">
              {/* 페이지 정보 및 페이지당 항목 수 선택 */}
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span>
                  총 {filteredRequirements.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredRequirements.length)}개 표시
                </span>
                <div className="flex items-center gap-2">
                  <label htmlFor="itemsPerPage" className="text-xs">페이지당:</label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1); // 페이지당 항목 수 변경 시 첫 페이지로 이동
                    }}
                    className="px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
                  >
                    <option value={5}>5개</option>
                    <option value={10}>10개</option>
                    <option value={20}>20개</option>
                    <option value={50}>50개</option>
                  </select>
                </div>
              </div>

              {/* 페이지 버튼들 */}
              <div className="flex items-center gap-1">
                {/* 첫 페이지 버튼 */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="첫 페이지"
                >
                  <Icon name="first_page" size="sm" />
                </button>

                {/* 이전 페이지 버튼 */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="이전 페이지"
                >
                  <Icon name="chevron_left" size="sm" />
                </button>

                {/* 페이지 번호들 */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`size-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            currentPage === i
                              ? "bg-primary text-white"
                              : "hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-primary"
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>

                {/* 다음 페이지 버튼 */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="다음 페이지"
                >
                  <Icon name="chevron_right" size="sm" />
                </button>

                {/* 마지막 페이지 버튼 */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="마지막 페이지"
                >
                  <Icon name="last_page" size="sm" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 업무협조 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              새 업무협조 추가
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
                  placeholder="업무협조 제목"
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
                  placeholder="업무협조 상세 설명"
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
              {/* OneDrive 링크 입력 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  OneDrive 문서 링크
                </label>
                <Input
                  value={newRequirement.oneDriveLink}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, oneDriveLink: e.target.value })
                  }
                  placeholder="https://1drv.ms/... 또는 SharePoint 링크"
                  leftIcon="link"
                />
                <p className="text-xs text-text-secondary mt-1">
                  OneDrive 또는 SharePoint 공유 링크를 입력하세요
                </p>
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

      {/* 업무협조 수정 모달 */}
      {editingRequirement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text dark:text-white mb-4">
              업무협조 수정
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
                  placeholder="업무협조 제목"
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
                  placeholder="업무협조 상세 설명"
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

              {/* OneDrive 링크 입력 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  OneDrive 문서 링크
                </label>
                <Input
                  value={editingRequirement.oneDriveLink || ""}
                  onChange={(e) =>
                    setEditingRequirement({ ...editingRequirement, oneDriveLink: e.target.value })
                  }
                  placeholder="https://1drv.ms/... 또는 SharePoint 링크"
                  leftIcon="link"
                />
                <p className="text-xs text-text-secondary mt-1">
                  OneDrive 또는 SharePoint 공유 링크를 입력하세요
                </p>
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

      {/* OneDrive 문서 미리보기 모달 */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-2">
                <Icon name="description" size="sm" className="text-primary" />
                <h3 className="font-semibold text-text dark:text-white">문서 미리보기</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* 새 창에서 열기 버튼 */}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface dark:bg-background-dark text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon name="open_in_new" size="xs" />
                  <span>새 창에서 열기</span>
                </a>
                {/* 닫기 버튼 */}
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text transition-colors"
                >
                  <Icon name="close" size="sm" />
                </button>
              </div>
            </div>
            {/* iframe 컨테이너 */}
            <div className="flex-1 bg-surface dark:bg-background-dark">
              <iframe
                src={getEmbedUrl(previewUrl)}
                className="w-full h-full border-0"
                title="OneDrive 문서 미리보기"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            {/* 모달 헤더 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-error/10 flex items-center justify-center">
                <Icon name="warning" size="md" className="text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text dark:text-white">삭제 확인</h3>
                <p className="text-xs text-text-secondary">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            {/* 삭제 대상 정보 */}
            <div className="mb-6 p-3 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark">
              <p className="text-sm text-text-secondary mb-1">삭제할 업무협조:</p>
              <p className="text-sm font-medium text-text dark:text-white truncate">
                &quot;{deleteModal.title}&quot;
              </p>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteModal(null)}
              >
                취소
              </Button>
              <button
                onClick={confirmDelete}
                disabled={deleteRequirement.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-error text-white font-medium hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteRequirement.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
