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
import { CustomerRequirementModal } from "./components";
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
  /** 상태 드롭다운이 열린 요구사항 ID */
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  /** 드롭다운이 위로 열려야 하는지 여부 */
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);

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

  // 데이터 조회
  const { data: requirements = [], isLoading, error } = useCustomerRequirements({
    projectId: selectedProjectId || undefined,
  });

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
    setOpenStatusDropdown(null);
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

  /** 날짜 포맷팅 */
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

          {/* 요구사항 목록 테이블 */}
          <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
            {/* 테이블 헤더 */}
            <div
              className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1200px]"
              style={{ gridTemplateColumns: "80px 100px 80px 80px 150px 1fr 80px 80px 200px 50px" }}
            >
              <div>상태</div>
              <div>요구번호</div>
              <div>사업부</div>
              <div>업무구분</div>
              <div>기능명</div>
              <div>요구사항</div>
              <div>요청일</div>
              <div>요청자</div>
              <div>적용방안</div>
              <div>수정</div>
            </div>

            {/* 빈 목록 */}
            {filteredRequirements.length === 0 && (
              <div className="p-8 text-center">
                <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
                <p className="text-text-secondary">
                  {requirements.length === 0
                    ? "등록된 고객요구사항이 없습니다."
                    : "검색 조건에 맞는 요구사항이 없습니다."}
                </p>
              </div>
            )}

            {/* 요구사항 목록 */}
            {paginatedRequirements.map((req) => {
              const statusConfig = APPLY_STATUS_CONFIG[req.applyStatus] || APPLY_STATUS_CONFIG.REVIEWING;

              return (
                <div
                  key={req.id}
                  className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px]"
                  style={{ gridTemplateColumns: "80px 100px 80px 80px 150px 1fr 80px 80px 200px 50px" }}
                >
                  {/* 상태 배지 (클릭 시 드롭다운) */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        if (openStatusDropdown === req.id) {
                          setOpenStatusDropdown(null);
                        } else {
                          setOpenStatusDropdown(req.id);
                          // 버튼의 위치를 계산하여 위로 열릴지 결정
                          const buttonRect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - buttonRect.bottom;
                          const dropdownHeight = 200; // 드롭다운 예상 높이
                          setDropdownOpenUpward(spaceBelow < dropdownHeight);
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${statusConfig.bgColor} ${statusConfig.color}`}
                      title="클릭하여 상태 변경"
                    >
                      <Icon name={statusConfig.icon} size="xs" />
                      <span className="hidden sm:inline">{statusConfig.label}</span>
                    </button>

                    {/* 상태 변경 드롭다운 */}
                    {openStatusDropdown === req.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenStatusDropdown(null)}
                        />
                        <div className={`absolute left-0 ${dropdownOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]`}>
                          {Object.entries(APPLY_STATUS_CONFIG).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(req.id, key as ApplyStatus)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                                req.applyStatus === key ? "bg-primary/5" : ""
                              }`}
                            >
                              <Icon name={config.icon} size="xs" className={config.color} />
                              <span className={config.color}>{config.label}</span>
                              {req.applyStatus === key && (
                                <Icon name="check" size="xs" className="ml-auto text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 요구번호 */}
                  <div>
                    <span className="text-xs text-text-secondary font-mono">
                      {req.code || "-"}
                    </span>
                  </div>

                  {/* 사업부 */}
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      {req.businessUnit || "-"}
                    </span>
                  </div>

                  {/* 업무구분 */}
                  <div>
                    <span className="text-xs text-text-secondary">
                      {req.category || "-"}
                    </span>
                  </div>

                  {/* 기능명 - 툴팁 */}
                  <div className="relative group/fn">
                    <p
                      className={`text-sm font-medium truncate cursor-default ${
                        req.applyStatus === "REJECTED" || req.applyStatus === "HOLD"
                          ? "text-text-secondary line-through"
                          : "text-text dark:text-white"
                      }`}
                    >
                      {req.functionName || "-"}
                    </p>
                    {/* 기능명 툴팁 */}
                    {req.functionName && (
                      <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/fn:opacity-100 transition-opacity">
                        <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[300px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400">기능명</span>
                          </div>
                          <p className="text-sm font-medium">{req.functionName}</p>
                        </div>
                        <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* 요구사항 - 툴팁 */}
                  <div className="relative group/content">
                    <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                      {req.content || "-"}
                    </p>
                    {/* 요구사항 툴팁 */}
                    {req.content && (
                      <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/content:opacity-100 transition-opacity">
                        <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400">요구사항</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{req.content}</p>
                        </div>
                        <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* 요청일 */}
                  <div>
                    <span className="text-xs text-text-secondary">
                      {formatDate(req.requestDate)}
                    </span>
                  </div>

                  {/* 요청자 */}
                  <div>
                    <span className="text-xs text-text dark:text-white">
                      {req.requester || "-"}
                    </span>
                  </div>

                  {/* 적용방안 - 툴팁 */}
                  <div className="relative group/solution">
                    <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                      {req.solution || "-"}
                    </p>
                    {/* 적용방안 툴팁 */}
                    {req.solution && (
                      <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/solution:opacity-100 transition-opacity">
                        <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-400">적용방안</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{req.solution}</p>
                        </div>
                        <div className="absolute right-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* 수정/삭제 버튼 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(req)}
                      className="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                      title="수정"
                    >
                      <Icon name="edit" size="xs" />
                    </button>
                    <button
                      onClick={() => handleDelete(req)}
                      className="size-7 rounded-lg flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                      title="삭제"
                    >
                      <Icon name="delete" size="xs" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 페이지네이션 */}
            {filteredRequirements.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-border-dark">
                {/* 좌측: 표시 정보 */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-secondary">
                    총 {filteredRequirements.length}건 중{" "}
                    {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredRequirements.length)}건 표시
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
                  >
                    <option value={10}>10개씩</option>
                    <option value={20}>20개씩</option>
                    <option value={50}>50개씩</option>
                    <option value={100}>100개씩</option>
                  </select>
                </div>

                {/* 우측: 페이지 네비게이션 */}
                <div className="flex items-center gap-1">
                  {/* 처음으로 */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="처음"
                  >
                    <Icon name="first_page" size="sm" />
                  </button>
                  {/* 이전 */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="이전"
                  >
                    <Icon name="chevron_left" size="sm" />
                  </button>

                  {/* 페이지 번호 */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisible = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    const end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) {
                      start = Math.max(1, end - maxVisible + 1);
                    }

                    if (start > 1) {
                      pages.push(1);
                      if (start > 2) pages.push("...");
                    }
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                    if (end < totalPages) {
                      if (end < totalPages - 1) pages.push("...");
                      pages.push(totalPages);
                    }

                    return pages.map((page, idx) =>
                      typeof page === "string" ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-text-secondary">
                          {page}
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`size-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-primary text-white"
                              : "hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    );
                  })()}

                  {/* 다음 */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="다음"
                  >
                    <Icon name="chevron_right" size="sm" />
                  </button>
                  {/* 마지막으로 */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="마지막"
                  >
                    <Icon name="last_page" size="sm" />
                  </button>
                </div>
              </div>
            )}
          </div>
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
