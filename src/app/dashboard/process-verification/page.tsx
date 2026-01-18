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
import {
  ProcessVerificationCategory,
  ProcessVerificationMaster,
  FilterState,
  verificationStatusConfig,
  PRODUCT_TYPES,
  ProductType,
} from "./types";
import { PRODUCT_TYPE_BUSINESS_UNITS } from "@/constants/business-units";

/**
 * 기능추적표 페이지 컴포넌트
 */
export default function ProcessVerificationPage() {
  /** 전역 프로젝트 선택 상태 (헤더에서 선택) */
  const { selectedProjectId, selectedProject } = useProject();

  // 상태
  const [categories, setCategories] = useState<ProcessVerificationCategory[]>([]);
  const [masters, setMasters] = useState<ProcessVerificationMaster[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedManagementArea, setSelectedManagementArea] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    categoryId: null,
    isApplied: null,
    status: null,
    search: "",
    productType: null, // 제품유형 필터
  });
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  // 뷰 선택 상태
  const [viewMode, setViewMode] = useState<"grid" | "comparison">("grid");
  // 그룹 비교 보기에서 선택한 사업부
  const [comparisonBusinessUnits, setComparisonBusinessUnits] = useState<string[]>([]);
  // 수정 모달 상태
  const [editingMaster, setEditingMaster] = useState<ProcessVerificationMaster | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // 추가 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // 엑셀 가져오기 모달 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMaster, setDeletingMaster] = useState<ProcessVerificationMaster | null>(null);
  // 통계 카드 접기/펼치기 상태
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

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

  // 마스터 로드 (카테고리 필터링은 클라이언트에서 처리)
  const loadMasters = useCallback(async () => {
    if (!selectedProjectId) return;

    setIsLoadingMasters(true);
    try {
      const params = new URLSearchParams();
      params.set("projectId", selectedProjectId);

      if (filter.productType) {
        params.set("productType", filter.productType);
      }
      if (filter.search) {
        params.set("search", filter.search);
      }

      const res = await fetch(`/api/process-verification/masters?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(data);
      }
    } catch (error) {
      console.error("마스터 로드 실패:", error);
    } finally {
      setIsLoadingMasters(false);
    }
  }, [selectedProjectId, filter.productType, filter.search]);

  // 프로젝트 ID 변경 시 카테고리 로드
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 필터 변경 시 마스터 로드
  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  // 필터링된 마스터
  const filteredMasters = useMemo(() => {
    return masters.filter((master) => {
      // 제품유형 필터
      if (filter.productType && master.productType !== filter.productType) {
        return false;
      }
      return true;
    });
  }, [masters, filter.productType]);

  // 테이블에 표시할 마스터 (카테고리 및 관리영역 선택 시 추가 필터링)
  const displayMasters = useMemo(() => {
    let result = filteredMasters;

    // 카테고리 필터
    if (selectedCategoryId) {
      result = result.filter((master) => master.categoryId === selectedCategoryId);
    }

    // 관리영역 필터
    if (selectedManagementArea) {
      result = result.filter((master) => master.managementArea === selectedManagementArea);
    }

    return result;
  }, [filteredMasters, selectedCategoryId, selectedManagementArea]);

  // 카테고리별 마스터 수 계산 (필터링된 마스터 기준)
  const categoriesWithCount = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      itemCount: filteredMasters.filter((master) => master.categoryId === cat.id).length,
    }));
  }, [categories, filteredMasters]);

  // 통계 계산 (마스터 기준)
  const stats = useMemo(() => {
    const total = masters.length;
    // 적용된 마스터: 하나 이상의 사업부에서 적용된 경우
    const applied = masters.filter((master) =>
      master.businessUnitApplies?.some((bu) => bu.isApplied)
    ).length;
    const notApplied = total - applied;
    // 검증 완료: 모든 적용된 사업부가 VERIFIED인 경우
    const verified = masters.filter((master) =>
      master.businessUnitApplies?.filter((bu) => bu.isApplied).every((bu) => bu.status === "VERIFIED")
      && master.businessUnitApplies?.some((bu) => bu.isApplied)
    ).length;
    const inProgress = masters.filter((master) =>
      master.businessUnitApplies?.some((bu) => bu.isApplied && bu.status === "IN_PROGRESS")
    ).length;
    return {
      total,
      applied,
      notApplied,
      verified,
      inProgress,
      filteredTotal: filteredMasters.length,
      filteredApplied: filteredMasters.filter((master) =>
        master.businessUnitApplies?.some((bu) => bu.isApplied)
      ).length,
    };
  }, [masters, filteredMasters]);

  // 사업부별 통계 계산 (그룹비교 모드용)
  const businessUnitStats = useMemo(() => {
    const allBusinessUnits = [...PRODUCT_TYPE_BUSINESS_UNITS.SMD, ...PRODUCT_TYPE_BUSINESS_UNITS.HANES];
    const stats: Record<string, { applied: number; notApplied: number; total: number; rate: number }> = {};

    allBusinessUnits.forEach((unit) => {
      let applied = 0;
      let notApplied = 0;

      masters.forEach((master) => {
        const apply = master.businessUnitApplies?.find((a) => a.businessUnit === unit);
        if (apply) {
          if (apply.isApplied) {
            applied++;
          } else {
            notApplied++;
          }
        }
      });

      const total = applied + notApplied;
      stats[unit] = {
        applied,
        notApplied,
        total,
        rate: total > 0 ? Math.round((applied / total) * 100) : 0,
      };
    });

    return stats;
  }, [masters]);

  // 카테고리 선택 핸들러
  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedManagementArea(null); // 관리영역 선택 해제
    setFilter((prev) => ({ ...prev, categoryId }));
  };

  // 관리영역 선택 핸들러
  const handleSelectManagementArea = (managementArea: string | null) => {
    setSelectedManagementArea(managementArea);
  };

  // 필터 변경 핸들러
  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  };

  // 데이터 새로고침 핸들러
  const handleRefresh = async () => {
    try {
      await loadCategories();
      await loadMasters();
      toast.success("데이터가 업데이트되었습니다.");
    } catch (err) {
      console.error("새로고침 실패:", err);
      toast.error("데이터 업데이트에 실패했습니다.");
    }
  };

  // 마스터 업데이트 핸들러
  const handleUpdateMaster = async (
    id: string,
    data: Partial<ProcessVerificationMaster>
  ) => {
    try {
      const res = await fetch(`/api/process-verification/masters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updatedMaster = await res.json();
        setMasters((prev) =>
          prev.map((master) => (master.id === id ? updatedMaster : master))
        );
      }
    } catch (error) {
      console.error("마스터 업데이트 실패:", error);
    }
  };

  // 마스터 수정 모달 열기
  const handleEditMaster = (master: ProcessVerificationMaster) => {
    setEditingMaster(master);
    setIsEditModalOpen(true);
  };

  // 마스터 삭제 핸들러
  const handleDeleteMaster = async (master: ProcessVerificationMaster) => {
    setDeletingMaster(master);
    setShowDeleteConfirm(true);
  };

  // 마스터 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingMaster) return;

    try {
      const res = await fetch(`/api/process-verification/masters/${deletingMaster.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // 목록에서 제거
        setMasters((prev) => prev.filter((m) => m.id !== deletingMaster.id));
        // 카테고리 카운트 업데이트를 위해 카테고리 다시 로드
        loadCategories();
        toast.success("마스터가 삭제되었습니다.");
        setShowDeleteConfirm(false);
        setDeletingMaster(null);
      } else {
        const result = await res.json();
        toast.error(`삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("마스터 삭제 실패:", error);
      toast.error("마스터 삭제 중 오류가 발생했습니다.");
    }
  };

  // 마스터 추가 핸들러
  const handleAddMaster = async (data: {
    categoryId: string;
    category: string;
    managementArea: string;
    detailItem: string;
    mesMapping: string;
    verificationDetail: string;
    managementCode: string;
    acceptanceStatus: string;
    existingMes: boolean;
    customerRequest: string;
    remarks: string;
    productType?: string;
  }) => {
    try {
      const res = await fetch("/api/process-verification/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newMaster = await res.json();
        setMasters((prev) => [...prev, newMaster]);
        // 카테고리 카운트 업데이트
        loadCategories();
      } else {
        const result = await res.json();
        throw new Error(result.error || "추가 실패");
      }
    } catch (error) {
      console.error("마스터 추가 실패:", error);
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
    if (filteredMasters.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    // 엑셀 데이터 변환 (마스터 기준)
    const excelData = filteredMasters.map((master) => ({
      "제품유형": master.productType,
      "관리코드": master.managementCode,
      "AS-IS 관리번호": master.asIsCode || "",
      "TO-BE 관리번호": master.toBeCode || "",
      "구분": master.category,
      "관리 영역": master.managementArea,
      "세부 관리 항목": master.detailItem,
      "세부 검증 내용": master.verificationDetail || "",
      "MES/IT 매핑": master.mesMapping || "",
      "기존MES": master.existingMes ? "Y" : "N",
      "V_IVI": master.businessUnitApplies?.find((bu) => bu.businessUnit === "V_IVI")?.isApplied ? "Y" : "N",
      "V_DISP": master.businessUnitApplies?.find((bu) => bu.businessUnit === "V_DISP")?.isApplied ? "Y" : "N",
      "V_PCBA": master.businessUnitApplies?.find((bu) => bu.businessUnit === "V_PCBA")?.isApplied ? "Y" : "N",
      "V_HMS": master.businessUnitApplies?.find((bu) => bu.businessUnit === "V_HMS")?.isApplied ? "Y" : "N",
      "수용 여부": master.acceptanceStatus || "",
      "고객 요청": master.customerRequest || "",
      "비고": master.remarks || "",
    }));

    // 워크시트 생성
    const worksheet = utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet["!cols"] = [
      { wch: 10 }, // 제품유형
      { wch: 12 }, // 관리코드
      { wch: 15 }, // AS-IS 관리번호
      { wch: 15 }, // TO-BE 관리번호
      { wch: 15 }, // 구분
      { wch: 25 }, // 관리 영역
      { wch: 40 }, // 세부 관리 항목
      { wch: 50 }, // 세부 검증 내용
      { wch: 20 }, // MES/IT 매핑
      { wch: 8 },  // 기존MES
      { wch: 8 },  // V_IVI
      { wch: 8 },  // V_DISP
      { wch: 8 },  // V_PCBA
      { wch: 8 },  // V_HMS
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
    loadMasters();
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
            disabled={!selectedProjectId || isLoadingCategories || isLoadingMasters}
            className={`flex items-center justify-center p-2 rounded-lg transition-all ${
              isLoadingCategories || isLoadingMasters
                ? "bg-primary/10 text-primary cursor-wait"
                : "bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text-secondary hover:text-primary hover:border-primary/30"
            }`}
            title="데이터 새로고침"
          >
            <Icon name={isLoadingCategories || isLoadingMasters ? "sync" : "refresh"} size="sm" className={isLoadingCategories || isLoadingMasters ? "animate-spin" : ""} />
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
            disabled={!selectedProjectId || filteredMasters.length === 0}
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
          {/* 통계 카드 - 슬라이딩 컨테이너 */}
          <div className="relative">
            {/* 통계 카드 영역 */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isStatsCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
              }`}
            >
              {viewMode === "grid" ? (
                /* 상세 그리드 모드: 기존 통계 카드 */
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pb-2">
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
              ) : (
                /* 그룹 비교 모드: 사업부별 통계 카드 (한 장) */
                <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 pb-2 mb-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="compare_arrows" size="sm" className="text-primary" />
                    <h3 className="text-sm font-semibold text-text dark:text-white">사업부별 적용 현황</h3>
                    <span className="text-xs text-text-secondary ml-auto">전체 마스터 {masters.length}건 기준</span>
                  </div>
                  <div className="space-y-3">
                    {[...PRODUCT_TYPE_BUSINESS_UNITS.SMD, ...PRODUCT_TYPE_BUSINESS_UNITS.HANES].map((unit) => {
                      const stat = businessUnitStats[unit];
                      if (!stat || stat.total === 0) return null;
                      return (
                        <div key={unit} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-text dark:text-white w-16">{unit}</span>
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                stat.rate >= 75 ? "bg-success" :
                                stat.rate >= 50 ? "bg-primary" :
                                stat.rate >= 25 ? "bg-warning" : "bg-error"
                              }`}
                              style={{ width: `${stat.rate}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs min-w-[120px] justify-end">
                            <span className="text-success font-semibold">Y:{stat.applied}</span>
                            <span className="text-text-secondary">N:{stat.notApplied}</span>
                            <span className={`font-bold min-w-[35px] text-right ${
                              stat.rate >= 75 ? "text-success" :
                              stat.rate >= 50 ? "text-primary" :
                              stat.rate >= 25 ? "text-warning" : "text-error"
                            }`}>
                              {stat.rate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 슬라이드 핸들 */}
            <div
              className="group flex items-center justify-center cursor-pointer"
              onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
              onMouseEnter={() => isStatsCollapsed && setIsStatsCollapsed(false)}
            >
              <div className={`
                flex items-center gap-2 px-4 py-1 rounded-full transition-all duration-200
                ${isStatsCollapsed
                  ? "bg-primary/10 border border-primary/30 hover:bg-primary/20"
                  : "bg-surface dark:bg-background-dark border border-border dark:border-border-dark hover:border-primary/30"
                }
              `}>
                <Icon
                  name={isStatsCollapsed ? "expand_more" : "expand_less"}
                  size="xs"
                  className={`transition-transform duration-200 ${isStatsCollapsed ? "text-primary" : "text-text-secondary group-hover:text-primary"}`}
                />
                <span className={`text-xs font-medium ${isStatsCollapsed ? "text-primary" : "text-text-secondary group-hover:text-primary"}`}>
                  {isStatsCollapsed ? "통계 보기" : "통계 접기"}
                </span>
                <Icon
                  name={isStatsCollapsed ? "expand_more" : "expand_less"}
                  size="xs"
                  className={`transition-transform duration-200 ${isStatsCollapsed ? "text-primary" : "text-text-secondary group-hover:text-primary"}`}
                />
              </div>
            </div>
          </div>

          {/* 필터 바 */}
          <FilterBar
            filter={filter}
            onFilterChange={handleFilterChange}
            totalCount={stats.filteredTotal}
            appliedCount={stats.filteredApplied}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* 메인 컨텐츠 */}
          {viewMode === "grid" ? (
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
              {/* 카테고리 사이드바 - 전체 카테고리 표시 */}
              <CategoryList
                categories={categories}
                items={filteredMasters}
                selectedCategoryId={selectedCategoryId}
                selectedManagementArea={selectedManagementArea}
                onSelectCategory={handleSelectCategory}
                onSelectManagementArea={handleSelectManagementArea}
                isLoading={isLoadingCategories}
              />

              {/* 마스터 테이블 - 선택된 카테고리로 필터링 */}
              <div className="flex-1 overflow-auto">
                <ItemTable
                  items={displayMasters}
                  isLoading={isLoadingMasters}
                  onUpdateItem={handleUpdateMaster}
                  onEditItem={handleEditMaster}
                  onDeleteItem={handleDeleteMaster}
                />
              </div>
            </div>
          ) : (
            <ComparisonGrid
              items={masters}
              selectedBusinessUnits={comparisonBusinessUnits}
              onBusinessUnitsChange={setComparisonBusinessUnits}
              isLoading={isLoadingMasters}
            />
          )}
        </>
      )}

      {/* 수정 모달 */}
      <EditItemModal
        item={editingMaster}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMaster(null);
        }}
        onSave={handleUpdateMaster}
      />

      {/* 추가 모달 */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddMaster}
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
        templateConfig={{
          fileName: "공정검증_템플릿",
          sheetName: "공정검증",
          columns: [
            { header: "제품유형", key: "productType", width: 10, example: "SMD" },
            { header: "구분", key: "category", width: 15, example: "재료관리" },
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
          "제품유형: SMD 또는 HANES",
          "구분: 카테고리명 (재료관리, SMD공정관리 등)",
          "관리코드가 없는 행은 건너뜁니다",
        ]}
        clearExistingLabel="기존 공정검증 데이터 삭제 후 가져오기"
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="마스터 삭제"
        message={
          deletingMaster
            ? `"${deletingMaster.managementCode}" 마스터를 삭제하시겠습니까?\n\n` +
              `제품유형: ${deletingMaster.productType}\n` +
              `관리 영역: ${deletingMaster.managementArea}\n` +
              `세부 항목: ${deletingMaster.detailItem}\n\n` +
              "이 작업은 되돌릴 수 없습니다."
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingMaster(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
