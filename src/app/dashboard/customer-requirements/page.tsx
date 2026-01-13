/**
 * @file src/app/dashboard/customer-requirements/page.tsx
 * @description
 * 고객요구사항 페이지입니다.
 * 고객요구사항 목록 조회, 등록, 수정, 삭제 기능을 제공합니다.
 * Issues 페이지 스타일을 따릅니다.
 *
 * 초보자 가이드:
 * 1. **통계 카드**: 적용률, 전체, 적용, 미적용, 검토중 현황
 * 2. **탭**: 활성(검토중/적용) vs 미적용/보류
 * 3. **필터**: 사업부, 검색어로 필터링
 * 4. **테이블**: 고객요구사항 목록 (상태 클릭으로 변경)
 *
 * @example
 * 접속 URL: /dashboard/customer-requirements
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button, Input, useToast, ConfirmModal } from "@/components/ui";
import { useProject } from "@/contexts";
import {
  useCustomerRequirements,
  useCreateCustomerRequirement,
  useUpdateCustomerRequirement,
  useDeleteCustomerRequirement,
} from "@/hooks";
import { CustomerRequirementModal, CustomerRequirementTable, DocumentView } from "./components";
import { ImportExcelModal } from "@/components/common";
import {
  type CustomerRequirement,
  type CustomerRequirementFormData,
  type ApplyStatus,
  APPLY_STATUS_CONFIG,
  BUSINESS_UNITS,
} from "./types";

/**
 * 고객요구사항 페이지 컴포넌트
 */
export default function CustomerRequirementsPage() {
  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  // 필터 상태
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRequester, setFilterRequester] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** 정렬 기준 (createdAt: 등록일, requestedDate: 요청일) */
  const [sortBy, setSortBy] = useState<"createdAt" | "requestedDate">("createdAt");
  /** 현재 선택된 탭 (active: 활성 요구사항, inactive: 미적용/보류) */
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  /** 보기 모드 (grid: 테이블 보기, document: 산출물 형식 보기) */
  const [viewMode, setViewMode] = useState<"grid" | "document">("grid");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 모달 상태
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    requirement: CustomerRequirement | null;
  }>({
    isOpen: false,
    mode: "create",
    requirement: null,
  });

  // 엑셀 가져오기 모달 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<CustomerRequirement | null>(null);

  const toast = useToast();

  // 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const queryFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
    }),
    [selectedProjectId]
  );

  // 데이터 조회
  const { data: requirements = [], isLoading, error, refetch: refetchRequirements } = useCustomerRequirements(queryFilters);

  // Mutations
  const createMutation = useCreateCustomerRequirement();
  const updateMutation = useUpdateCustomerRequirement();
  const deleteMutation = useDeleteCustomerRequirement();

  // 탭별 요구사항 분리
  const activeRequirements = requirements.filter(
    (r) => r.applyStatus === "REVIEWING" || r.applyStatus === "APPLIED"
  );
  const inactiveRequirements = requirements.filter(
    (r) => r.applyStatus === "REJECTED" || r.applyStatus === "HOLD"
  );

  // 현재 탭에 해당하는 요구사항 목록
  const tabRequirements = activeTab === "active" ? activeRequirements : inactiveRequirements;

  // 필터링 및 정렬된 요구사항
  const filteredRequirements = useMemo(() => {
    const filtered = tabRequirements.filter((req) => {
      const matchesBusinessUnit =
        filterBusinessUnit === "all" || req.businessUnit === filterBusinessUnit;
      const matchesCategory =
        filterCategory === "all" || req.category === filterCategory;
      const matchesRequester =
        filterRequester === "all" || req.requester === filterRequester;
      const matchesSearch =
        !searchQuery ||
        req.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.functionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.content?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBusinessUnit && matchesCategory && matchesRequester && matchesSearch;
    });

    // 정렬 적용 (내림차순)
    return filtered.sort((a, b) => {
      if (sortBy === "createdAt") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        // requestedDate 정렬 (null 값은 맨 뒤로)
        if (!a.requestDate) return 1;
        if (!b.requestDate) return -1;
        return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      }
    });
  }, [tabRequirements, filterBusinessUnit, filterCategory, filterRequester, searchQuery, sortBy]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);
  const paginatedRequirements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequirements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequirements, currentPage, itemsPerPage]);

  // 필터/탭/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterBusinessUnit, filterCategory, filterRequester, searchQuery, sortBy]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = requirements.length;
    const applied = requirements.filter((r) => r.applyStatus === "APPLIED").length;
    const rejected = requirements.filter((r) => r.applyStatus === "REJECTED").length;
    const reviewing = requirements.filter((r) => r.applyStatus === "REVIEWING").length;
    const hold = requirements.filter((r) => r.applyStatus === "HOLD").length;
    return {
      total,
      applied,
      rejected,
      reviewing,
      hold,
      appliedRate: total > 0 ? Math.round((applied / total) * 100) : 0,
    };
  }, [requirements]);

  // 사업부별 통계
  const businessUnitStats = useMemo(() => {
    const unitCounts: Record<string, number> = {};
    requirements.forEach((req) => {
      if (req.businessUnit) {
        unitCounts[req.businessUnit] = (unitCounts[req.businessUnit] || 0) + 1;
      }
    });
    return unitCounts;
  }, [requirements]);

  // 필터 옵션: 업무구분 목록 추출
  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    requirements.forEach((req) => {
      if (req.category) categories.add(req.category);
    });
    return Array.from(categories).sort();
  }, [requirements]);

  // 필터 옵션: 요청자 목록 추출
  const requesterOptions = useMemo(() => {
    const requesters = new Set<string>();
    requirements.forEach((req) => {
      if (req.requester) requesters.add(req.requester);
    });
    return Array.from(requesters).sort();
  }, [requirements]);

  // 모달 열기 - 등록
  const handleOpenCreate = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "create",
      requirement: null,
    });
  }, []);

  // 모달 열기 - 수정
  const handleOpenEdit = useCallback((requirement: CustomerRequirement) => {
    setModalState({
      isOpen: true,
      mode: "edit",
      requirement,
    });
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: "create",
      requirement: null,
    });
  }, []);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (formData: CustomerRequirementFormData) => {
      if (modalState.mode === "create") {
        await createMutation.mutateAsync({
          ...formData,
          projectId: selectedProjectId || "",
          requestDate: formData.requestDate || undefined,
        });
      } else if (modalState.requirement) {
        await updateMutation.mutateAsync({
          id: modalState.requirement.id,
          data: {
            ...formData,
            requestDate: formData.requestDate || undefined,
          },
        });
      }
    },
    [modalState, selectedProjectId, createMutation, updateMutation]
  );

  // 삭제 핸들러
  const handleDelete = useCallback(
    (req: CustomerRequirement) => {
      setDeletingRequirement(req);
      setShowDeleteConfirm(true);
    },
    []
  );

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingRequirement) return;
    try {
      await deleteMutation.mutateAsync(deletingRequirement.id);
      toast.success("고객요구사항이 삭제되었습니다.");
      setShowDeleteConfirm(false);
      setDeletingRequirement(null);
    } catch (error) {
      toast.error("고객요구사항 삭제에 실패했습니다.");
    }
  };

  /**
   * 상태 변경 (드롭다운에서 선택)
   */
  const handleStatusChange = async (id: string, newStatus: ApplyStatus) => {
    await updateMutation.mutateAsync({
      id,
      data: { applyStatus: newStatus },
    });
  };

  /**
   * 데이터 새로고침 핸들러
   * 캐시를 무시하고 최신 고객요구사항 데이터를 가져옵니다.
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

    const excelData = filteredRequirements.map((req, idx) => ({
      "순번": idx + 1,
      "요구번호": req.code || "",
      "사업부": req.businessUnit || "",
      "업무구분": req.category || "",
      "기능명": req.functionName || "",
      "요구사항": req.content || "",
      "요청일자": req.requestDate ? new Date(req.requestDate).toLocaleDateString() : "",
      "요청자": req.requester || "",
      "적용방안": req.solution || "",
      "적용여부": APPLY_STATUS_CONFIG[req.applyStatus]?.label || req.applyStatus,
      "비고": req.remarks || "",
    }));

    const worksheet = utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
      { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 20 },
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "고객요구사항");

    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_고객요구사항_${dateStr}.xlsx`);
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
            <Icon name="contact_page" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              CUSTOMER REQUIREMENTS
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 고객요구사항
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            고객 사업부별 요구사항을 관리합니다
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
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="outline"
            leftIcon="upload"
            onClick={() => setIsImportModalOpen(true)}
            disabled={!selectedProjectId}
          >
            Excel 가져오기
          </Button>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={handleOpenCreate}
            disabled={!selectedProjectId}
          >
            새 항목 추가
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
            상단 헤더에서 프로젝트를 선택하면 해당 프로젝트의 고객요구사항을 관리할 수 있습니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {/* 적용률 카드 */}
            <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="speed" size="xs" className="text-primary" />
                <span className="text-xs font-semibold text-primary">적용률</span>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {stats.appliedRate}%
              </p>
              <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
                  style={{ width: `${stats.appliedRate}%` }}
                />
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="list_alt" size="xs" className="text-primary" />
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
                  <p className="text-xl font-bold text-text dark:text-white">{stats.applied}</p>
                  <p className="text-[10px] text-text-secondary">적용</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Icon name="pending" size="xs" className="text-warning" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.reviewing}</p>
                  <p className="text-[10px] text-text-secondary">검토중</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-error/10 flex items-center justify-center">
                  <Icon name="cancel" size="xs" className="text-error" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{stats.rejected}</p>
                  <p className="text-[10px] text-text-secondary">미적용</p>
                </div>
              </div>
            </div>
            {/* 사업부 정보 카드 */}
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="business" size="xs" className="text-cyan-500" />
                <span className="text-xs font-semibold text-cyan-500">사업부</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                {BUSINESS_UNITS.map((unit) => (
                  <div key={unit} className="text-center flex-1">
                    <p className="text-sm font-bold text-text dark:text-white">
                      {businessUnitStats[unit] || 0}
                    </p>
                    <p className="text-[8px] text-text-secondary truncate">{unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="pending_actions" size="xs" />
              <span>활성 요구사항</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === "active" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
              }`}>
                {activeRequirements.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "inactive"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="block" size="xs" />
              <span>미적용/보류</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === "inactive" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
              }`}>
                {inactiveRequirements.length}
              </span>
            </button>
          </div>

          {/* 필터 및 보기 모드 전환 */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 좌측: 필터 */}
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
                value={filterBusinessUnit}
                onChange={(e) => setFilterBusinessUnit(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
              >
                <option value="all">전체 사업부</option>
                {BUSINESS_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {/* 업무구분 필터 */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
              >
                <option value="all">전체 업무구분</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {/* 요청자 필터 */}
              <select
                value={filterRequester}
                onChange={(e) => setFilterRequester(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
              >
                <option value="all">전체 요청자</option>
                {requesterOptions.map((requester) => (
                  <option key={requester} value={requester}>{requester}</option>
                ))}
              </select>
              {/* 정렬 기준 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "createdAt" | "requestedDate")}
                className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
              >
                <option value="createdAt">등록일 기준</option>
                <option value="requestedDate">요청일 기준</option>
              </select>
            </div>

            {/* 우측: 보기 모드 전환 */}
            <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
                title="그리드 보기"
              >
                <Icon name="grid_view" size="xs" />
                <span className="hidden sm:inline">그리드</span>
              </button>
              <button
                onClick={() => setViewMode("document")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "document"
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
                title="산출물 형식 보기"
              >
                <Icon name="description" size="xs" />
                <span className="hidden sm:inline">산출물</span>
              </button>
            </div>
          </div>

          {/* 요구사항 목록 (보기 모드에 따라 다르게 렌더링) */}
          {viewMode === "grid" ? (
            <CustomerRequirementTable
              requirements={paginatedRequirements}
              totalCount={filteredRequirements.length}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(count) => {
                setItemsPerPage(count);
                setCurrentPage(1);
              }}
              emptyMessage={
                requirements.length === 0
                  ? "등록된 고객요구사항이 없습니다."
                  : "검색 조건에 맞는 요구사항이 없습니다."
              }
            />
          ) : (
            <DocumentView
              requirements={filteredRequirements}
              onEdit={handleOpenEdit}
              projectName={selectedProject?.name}
            />
          )}
        </>
      )}

      {/* 등록/수정 모달 */}
      <CustomerRequirementModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        requirement={modalState.requirement}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      {/* 엑셀 가져오기 모달 */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        projectId={selectedProjectId || ""}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
        title="고객요구사항 가져오기"
        apiEndpoint="/api/customer-requirements/import"
        templateConfig={{
          fileName: "고객요구사항_템플릿",
          sheetName: "고객요구사항",
          columns: [
            { header: "순번", key: "sequence", width: 8, example: 1 },
            { header: "요구번호", key: "code", width: 15, example: "RQIT_00001" },
            { header: "사업부", key: "businessUnit", width: 12, example: "V_DISP" },
            { header: "업무구분", key: "category", width: 12, example: "공통" },
            { header: "기능명", key: "functionName", width: 20, example: "모바일 알람" },
            { header: "요구사항", key: "content", width: 40, example: "모바일 알람 기능 요청" },
            { header: "요청일자", key: "requestDate", width: 12, example: "2025-01-01" },
            { header: "요청자", key: "requester", width: 10, example: "홍길동" },
            { header: "적용방안", key: "solution", width: 30, example: "푸시 알림 적용" },
            { header: "적용여부", key: "applyStatus", width: 10, example: "적용" },
            { header: "비고", key: "remarks", width: 20, example: "" },
          ],
        }}
        hints={[
          "첫 번째 행은 헤더로 인식됩니다",
          "요구번호가 없으면 자동 생성됩니다",
          "사업부: V_HNS, V_DISP, V_IVI, V_PCBA, IT",
          "적용여부: 적용/미적용/검토중/보류",
        ]}
        clearExistingLabel="기존 고객요구사항 삭제 후 가져오기"
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="고객요구사항 삭제"
        message={
          deletingRequirement
            ? `"${deletingRequirement.code}" 항목을 삭제하시겠습니까?\n\n` +
              `기능명: ${deletingRequirement.functionName}\n` +
              `요구사항: ${deletingRequirement.content?.substring(0, 50)}...\n\n` +
              "이 작업은 되돌릴 수 없습니다."
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingRequirement(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
