/**
 * @file src/app/dashboard/process-verification/page.tsx
 * @description
 * 기능추적표(공정검증) 페이지입니다.
 * Excel에서 가져온 공정검증 항목을 카테고리별로 관리하며, 두 가지 뷰를 제공합니다:
 * - 현재 그리드: 개별 항목 조회/편집
 * - 그룹 비교: 사업부별 관리영역 현황 비교
 *
 * 초보자 가이드:
 * 1. **그리드 뷰**: 좌측 카테고리 선택 → 우측 테이블에서 항목 조회/편집
 * 2. **비교 뷰**: 사업부 다중 선택 → 관리영역별 Y/N 현황 및 사용율 비교
 * 3. Excel 가져오기로 데이터 일괄 등록
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { utils, writeFile } from "xlsx";
import { CategoryList, ItemTable, FilterBar, EditItemModal, AddItemModal, ComparisonGrid } from "./components";
import { useProject } from "@/contexts";
import { Icon, Button, useToast, ConfirmModal } from "@/components/ui";
import { ImportExcelModal, type ImportResult } from "@/components/common";
import { BUSINESS_UNITS } from "@/constants/business-units";
import {
  ProcessVerificationCategory,
  ProcessVerificationItem,
  FilterState,
  verificationStatusConfig,
} from "./types";

/**
 * 기능추적표 페이지 컴포넌트
 */
export default function ProcessVerificationPage() {
  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  // 상태
  const [categories, setCategories] = useState<ProcessVerificationCategory[]>([]);
  const [items, setItems] = useState<ProcessVerificationItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    categoryId: null,
    isApplied: null,
    status: null,
    search: "",
    businessUnit: "V_IVI", // 기존 데이터가 모두 V_IVI로 업데이트됨
  });
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  // 뷰 선택 상태
  const [viewMode, setViewMode] = useState<"grid" | "comparison">("grid");
  // 그룹 비교 보기에서 선택한 사업부
  const [comparisonBusinessUnits, setComparisonBusinessUnits] = useState<string[]>([]);
  // 수정 모달 상태
  const [editingItem, setEditingItem] = useState<ProcessVerificationItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // 엑셀 가져오기 모달 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ProcessVerificationItem | null>(null);

  const toast = useToast();

  // 카테고리 로드
  const loadCategories = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoadingCategories(true);
    try {
      const res = await fetch(
        `/api/process-verification/categories?projectId=${selectedProjectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("카테고리 로드 실패:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedProjectId]);

  // 항목 로드
  const loadItems = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams();
      params.set("projectId", selectedProjectId);

      if (selectedCategoryId) {
        params.set("categoryId", selectedCategoryId);
      }
      if (filter.isApplied !== null) {
        params.set("isApplied", String(filter.isApplied));
      }
      if (filter.search) {
        params.set("search", filter.search);
      }
      // 비교 보기 모드가 아닐 때만 사업부 필터 적용
      if (viewMode === "grid" && filter.businessUnit) {
        params.set("businessUnit", filter.businessUnit);
      }

      const res = await fetch(`/api/process-verification/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("항목 로드 실패:", error);
    } finally {
      setIsLoadingItems(false);
    }
  }, [selectedProjectId, selectedCategoryId, filter.isApplied, filter.search, filter.businessUnit, viewMode]);

  // 프로젝트 ID 변경 시 카테고리 로드
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 카테고리 또는 필터 변경 시 항목 로드
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 필터링된 항목
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter.status && item.status !== filter.status) {
        return false;
      }
      // 사업부는 항상 필터링됨 (선택 필수)
      if (item.businessUnit !== filter.businessUnit) {
        return false;
      }
      return true;
    });
  }, [items, filter.status, filter.businessUnit]);

  // 필터링된 항목이 속한 카테고리만 선별
  const filteredCategories = useMemo(() => {
    if (filteredItems.length === 0) return [];
    const categoryIds = new Set(filteredItems.map((item) => item.categoryId));
    return categories.filter((cat) => categoryIds.has(cat.id));
  }, [categories, filteredItems]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = items.length;
    const applied = items.filter((item) => item.isApplied).length;
    const notApplied = total - applied;
    const verified = items.filter((item) => item.status === "VERIFIED").length;
    const inProgress = items.filter((item) => item.status === "IN_PROGRESS").length;
    return {
      total,
      applied,
      notApplied,
      verified,
      inProgress,
      filteredTotal: filteredItems.length,
      filteredApplied: filteredItems.filter((item) => item.isApplied).length,
    };
  }, [items, filteredItems]);

  // 필터링된 카테고리에 현재 선택된 카테고리가 없으면 선택 해제
  useEffect(() => {
    if (selectedCategoryId && !filteredCategories.some((cat) => cat.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [filteredCategories, selectedCategoryId]);

  // 카테고리 선택 핸들러
  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setFilter((prev) => ({ ...prev, categoryId }));
  };

  // 필터 변경 핸들러
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  };

  // 데이터 새로고침 핸들러
  const handleRefresh = async () => {
    try {
      await loadCategories();
      await loadItems();
      toast.success("데이터가 업데이트되었습니다.");
    } catch (err) {
      console.error("새로고침 실패:", err);
      toast.error("데이터 업데이트에 실패했습니다.");
    }
  };

  // 항목 업데이트 핸들러
  const handleUpdateItem = async (
    id: string,
    data: Partial<ProcessVerificationItem>
  ) => {
    try {
      const res = await fetch(`/api/process-verification/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updatedItem : item))
        );
      }
    } catch (error) {
      console.error("항목 업데이트 실패:", error);
    }
  };

  // 항목 수정 모달 열기
  const handleEditItem = (item: ProcessVerificationItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // 항목 삭제 핸들러
  const handleDeleteItem = async (item: ProcessVerificationItem) => {
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  // 항목 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const res = await fetch(`/api/process-verification/items/${deletingItem.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // 목록에서 제거
        setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
        // 카테고리 카운트 업데이트를 위해 카테고리 다시 로드
        loadCategories();
        toast.success("항목이 삭제되었습니다.");
        setShowDeleteConfirm(false);
        setDeletingItem(null);
      } else {
        const result = await res.json();
        toast.error(`삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("항목 삭제 실패:", error);
      toast.error("항목 삭제 중 오류가 발생했습니다.");
    }
  };

  // 항목 추가 핸들러
  const handleAddItem = async (data: {
    categoryId: string;
    category: string;
    isApplied: boolean;
    managementArea: string;
    detailItem: string;
    mesMapping: string;
    verificationDetail: string;
    managementCode: string;
    acceptanceStatus: string;
    existingMes: boolean;
    customerRequest: string;
    remarks: string;
    status: string;
  }) => {
    try {
      const res = await fetch("/api/process-verification/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [...prev, newItem]);
        // 카테고리 카운트 업데이트
        loadCategories();
      } else {
        const result = await res.json();
        throw new Error(result.error || "추가 실패");
      }
    } catch (error) {
      console.error("항목 추가 실패:", error);
      throw error;
    }
  };

  /**
   * 새 카테고리 생성 핸들러
   * AddItemModal에서 새 카테고리 추가 시 호출됨
   */
  const handleCreateCategory = async (data: {
    code: string;
    name: string;
  }): Promise<ProcessVerificationCategory> => {
    const res = await fetch("/api/process-verification/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId,
        code: data.code,
        name: data.name,
      }),
    });

    if (res.ok) {
      const newCategory = await res.json();
      // 카테고리 목록 업데이트
      setCategories((prev) => [...prev, newCategory]);
      return newCategory;
    } else {
      const result = await res.json();
      throw new Error(result.error || "카테고리 생성 실패");
    }
  };

  /**
   * 엑셀 다운로드 핸들러
   */
  const handleExportToExcel = () => {
    if (filteredItems.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 변환
    const excelData = filteredItems.map((item) => ({
      "관리코드": item.managementCode,
      "구분": item.category,
      "관리 영역": item.managementArea,
      "세부 관리 항목": item.detailItem,
      "세부 검증 내용": item.verificationDetail || "",
      "MES/IT 매핑": item.mesMapping || "",
      "기존MES": item.existingMes ? "Y" : "N",
      "적용": item.isApplied ? "Y" : "N",
      "상태": verificationStatusConfig[item.status]?.label || item.status,
      "수용 여부": item.acceptanceStatus || "",
      "고객 요청": item.customerRequest || "",
      "비고": item.remarks || "",
    }));

    // 워크시트 생성
    const worksheet = utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet["!cols"] = [
      { wch: 12 }, // 관리코드
      { wch: 15 }, // 구분
      { wch: 25 }, // 관리 영역
      { wch: 40 }, // 세부 관리 항목
      { wch: 50 }, // 세부 검증 내용
      { wch: 20 }, // MES/IT 매핑
      { wch: 8 },  // 기존MES
      { wch: 8 },  // 적용
      { wch: 12 }, // 상태
      { wch: 15 }, // 수용 여부
      { wch: 30 }, // 고객 요청
      { wch: 30 }, // 비고
    ];

    // 워크북 생성 및 파일 저장
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "기능추적표");

    // 파일명 생성 (프로젝트명_기능추적표_날짜)
    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${projectName}_기능추적표_${dateStr}.xlsx`);
  };

  /**
   * 엑셀 가져오기 성공 콜백
   */
  const handleImportSuccess = (result: ImportResult) => {
    if (result.stats) {
      toast.success(
        `Excel 가져오기 완료! (전체: ${result.stats.total}건, 등록: ${result.stats.created}건` +
          (result.stats.skipped > 0 ? `, 건너뜀: ${result.stats.skipped}건` : "") +
          (result.stats.errors.length > 0 ? `, 오류: ${result.stats.errors.length}개` : "") +
          ")"
      );
    }
    loadCategories();
    loadItems();
    setIsImportModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      {/* 헤더 - 대시보드 차트 스타일 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="fact_check" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              PROCESS VERIFICATION
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 기능추적표
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            공정검증 항목을 관리하고 검증 상태를 추적합니다
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
            disabled={!selectedProjectId || isLoadingCategories || isLoadingItems}
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${
              isLoadingCategories || isLoadingItems
                ? "bg-primary/10 text-primary cursor-wait"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary/30"
            }`}
            title="데이터 새로고침"
          >
            <Icon name={isLoadingCategories || isLoadingItems ? "sync" : "refresh"} size="sm" className={isLoadingCategories || isLoadingItems ? "animate-spin" : ""} />
          </button>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setIsAddModalOpen(true)}
            disabled={!selectedProjectId || categories.length === 0}
          >
            새 항목 추가
          </Button>
          <Button
            variant="outline"
            leftIcon="download"
            onClick={handleExportToExcel}
            disabled={!selectedProjectId || filteredItems.length === 0}
            className="hidden sm:flex"
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
            상단 헤더에서 프로젝트를 선택하면 기능추적표 목록이 표시됩니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 적용률 카드 */}
            <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="speed" size="xs" className="text-primary" />
                <span className="text-xs font-semibold text-primary">적용률</span>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {stats.total > 0 ? Math.round((stats.applied / stats.total) * 100) : 0}%
              </p>
              <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
                  style={{ width: stats.total > 0 ? `${(stats.applied / stats.total) * 100}%` : "0%" }}
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
                  <p className="text-xl font-bold text-text dark:text-white">{stats.notApplied}</p>
                  <p className="text-[10px] text-text-secondary">미적용</p>
                </div>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Icon name="category" size="xs" className="text-cyan-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text dark:text-white">{categories.length}</p>
                  <p className="text-[10px] text-text-secondary">카테고리</p>
                </div>
              </div>
            </div>
          </div>

          {/* 필터 바 */}
          <FilterBar
            filter={filter}
            onFilterChange={handleFilterChange}
            totalCount={stats.filteredTotal}
            appliedCount={stats.filteredApplied}
            categories={categories}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* 메인 컨텐츠 */}
          {viewMode === "grid" ? (
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
              {/* 카테고리 사이드바 */}
              <CategoryList
                categories={filteredCategories}
                items={filteredItems}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                isLoading={isLoadingCategories}
              />

              {/* 항목 테이블 */}
              <div className="flex-1 overflow-auto">
                <ItemTable
                  items={filteredItems}
                  isLoading={isLoadingItems}
                  onUpdateItem={handleUpdateItem}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            </div>
          ) : (
            <ComparisonGrid
              items={items}
              selectedBusinessUnits={comparisonBusinessUnits}
              onBusinessUnitsChange={setComparisonBusinessUnits}
              isLoading={isLoadingItems}
            />
          )}
        </>
      )}

      {/* 수정 모달 */}
      <EditItemModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleUpdateItem}
      />

      {/* 추가 모달 */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddItem}
        onCreateCategory={handleCreateCategory}
        categories={categories}
        defaultCategoryId={selectedCategoryId}
      />

      {/* 엑셀 가져오기 모달 */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        projectId={selectedProjectId || ""}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        title="공정검증 데이터 가져오기"
        apiEndpoint="/api/process-verification/import"
        businessUnit={filter.businessUnit}
        businessUnitList={BUSINESS_UNITS}
        onBusinessUnitChange={(businessUnit) => setFilter((prev) => ({ ...prev, businessUnit }))}
        templateConfig={{
          fileName: "공정검증_템플릿",
          sheetName: "공정검증",
          columns: [
            { header: "구분", key: "category", width: 15, example: "재료관리" },
            { header: "적용여부(Y/N)", key: "isApplied", width: 12, example: "Y" },
            { header: "관리 영역", key: "managementArea", width: 25, example: "자재 입고" },
            { header: "세부 관리 항목", key: "detailItem", width: 40, example: "자재 입고 검수" },
            { header: "MES/IT 매핑", key: "mesMapping", width: 15, example: "MES-001" },
            { header: "세부 검증 내용", key: "verificationDetail", width: 50, example: "입고 시 바코드 스캔 검증" },
            { header: "관리코드", key: "managementCode", width: 15, example: "MAT-001" },
            { header: "수용 여부", key: "acceptanceStatus", width: 12, example: "수용" },
            { header: "기존MES(Y/N)", key: "existingMes", width: 12, example: "N" },
            { header: "고객 요청", key: "customerRequest", width: 30, example: "" },
          ],
        }}
        hints={[
          "첫 번째 행은 헤더로 인식됩니다",
          "구분: 카테고리명 (재료관리, SMD공정관리 등)",
          "관리코드가 없는 행은 건너뜁니다",
          "적용여부, 기존MES: Y 또는 N",
        ]}
        clearExistingLabel="기존 공정검증 데이터 삭제 후 가져오기"
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="항목 삭제"
        message={
          deletingItem
            ? `"${deletingItem.managementCode}" 항목을 삭제하시겠습니까?\n\n` +
              `관리 영역: ${deletingItem.managementArea}\n` +
              `세부 항목: ${deletingItem.detailItem}\n\n` +
              "이 작업은 되돌릴 수 없습니다."
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingItem(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
