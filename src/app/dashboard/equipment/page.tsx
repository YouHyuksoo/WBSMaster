/**
 * @file src/app/dashboard/equipment/page.tsx
 * @description
 * 설비 관리 메인 페이지 - React Flow 기반 노드 캔버스
 *
 * 초보자 가이드:
 * 1. **EquipmentToolbar**: 상단 툴바 (제목, 프로젝트 정보, 새 설비 추가)
 * 2. **필터 바**: 라인, 타입, 상태, 위치 필터링 (캔버스 상단)
 *    - 라인도 다른 필터와 같은 일반 필터: 기본값 "전체 라인"(ALL), 라인을 고르면 API 에서 그 라인만 조회
 *    - 라인 목록은 프로젝트 전체 라인을 불러온다 (filters API 에 "ALL" 전달)
 * 3. **EquipmentCanvas**: 중앙 캔버스 (노드 + 연결선)
 * 4. **EquipmentListPanel**: 좌측 설비 목록
 * 5. **EquipmentSidebar**: 우측 사이드바 (선택한 설비 편집)
 *
 * 수정 방법:
 * - 레이아웃 변경: className 수정
 * - 필터 추가: uniqueLines, uniqueLocations에 필터 옵션 추가
 * - 추가 기능: 컴포넌트 추가
 */

"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { utils, writeFile } from "xlsx";
import { useProject } from "@/contexts";
import { Equipment, EquipmentStatus, EquipmentType } from "@/lib/api";
import { useEquipment, useEquipmentLines } from "./hooks/useEquipment";
import { useEquipmentConnections } from "./hooks/useEquipmentConnections";
import { STATUS_CONFIG, TYPE_CONFIG } from "./types";
import {
  EquipmentToolbar,
  EquipmentCanvas,
  EquipmentSidebar,
  EquipmentListPanel,
  EquipmentGridView,
  EquipmentModal,
} from "./components";

/**
 * 설비 관리 페이지
 */
export default function EquipmentPage() {
  const { selectedProjectId, selectedProject } = useProject();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // 뷰 모드 상태 (grid: 그리드 보기, canvas: 캔버스 보기)
  const [viewMode, setViewMode] = useState<"grid" | "canvas">("grid");

  // 페이지네이션 상태 (그리드 뷰용)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 설비 수정 모달 상태
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    equipment: Equipment | null;
  }>({
    isOpen: false,
    equipment: null,
  });

  // 필터 상태 (초기값: 선택 안 됨)
  const [lineFilter, setLineFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<EquipmentType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "ALL">("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");

  // 찾기 기능 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [focusEquipmentId, setFocusEquipmentId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // 선택된 연결선 및 영역 선택 스타일 (CSS)
  const edgeStyles = `
    /* 선택된 연결선 스타일 */
    .react-flow__edge.selected .react-flow__edge-path {
      stroke: #00f3ff !important;
      stroke-width: 4px !important;
      filter: drop-shadow(0 0 8px rgba(0, 243, 255, 0.6));
      animation: pulse-edge 2s ease-in-out infinite;
    }

    .react-flow__edge:hover .react-flow__edge-path {
      stroke-width: 3px !important;
      filter: drop-shadow(0 0 4px rgba(148, 163, 184, 0.4));
    }

    @keyframes pulse-edge {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .react-flow__edge.selected .react-flow__edge-textbg {
      fill: #00f3ff;
    }

    /* 영역 선택 박스 스타일 */
    .react-flow__selection {
      background: rgba(0, 243, 255, 0.08) !important;
      border: 2px dashed #00f3ff !important;
    }

    /* 선택된 노드 - 단순 깜빡임 */
    .react-flow__node.selected {
      box-shadow: 0 0 0 3px #00f3ff, 0 0 20px rgba(0, 243, 255, 0.5) !important;
    }

    /* 선택된 노드 - 살짝 커졌다 작아졌다 */
    .animate-pulse-subtle {
      animation: pulse-subtle 1.5s ease-in-out infinite;
    }

    @keyframes pulse-subtle {
      0%, 100% {
        box-shadow: 0 0 0 3px #00f3ff, 0 4px 15px rgba(0, 0, 0, 0.1);
      }
      50% {
        box-shadow: 0 0 0 5px #00f3ff, 0 8px 25px rgba(0, 243, 255, 0.3);
      }
    }
  `;

  // 라인 목록 조회 (프로젝트 전체 라인)
  const { data: lineData } = useEquipmentLines(selectedProjectId || undefined);

  // 설비 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const equipmentFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
      lineCode: lineFilter !== "ALL" ? lineFilter : undefined,
    }),
    [selectedProjectId, lineFilter]
  );

  // 설비 데이터 조회 (필터 조건으로)
  const {
    data: equipmentData = [],
    isLoading: isLoadingEquipments,
    error: equipmentsError,
  } = useEquipment(equipmentFilters);

  // 실제 사용할 설비 목록
  const equipments = equipmentData;

  // 연결선 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const connectionFilters = useMemo(
    () => ({
      projectId: selectedProjectId || undefined,
    }),
    [selectedProjectId]
  );

  const {
    data: connections = [],
    isLoading: isLoadingConnections,
  } = useEquipmentConnections(connectionFilters);

  // 라인 목록
  const uniqueLines = lineData?.lines || [];

  // 위치 목록 (조회된 데이터에서 추출)
  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(equipments.map((eq) => eq.location).filter((x): x is string => Boolean(x))));
  }, [equipments]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [lineFilter, typeFilter, statusFilter, locationFilter]);

  // 필터링된 설비 목록 (API에서 라인 필터링됨, 추가로 타입/상태/위치 클라이언트 필터링)
  const filteredEquipments = useMemo(() => {
    let result = equipments;

    // 타입 필터
    if (typeFilter !== "ALL") {
      result = result.filter((eq) => eq.type === typeFilter);
    }

    // 상태 필터
    if (statusFilter !== "ALL") {
      result = result.filter((eq) => eq.status === statusFilter);
    }

    // 위치 필터
    if (locationFilter !== "ALL") {
      result = result.filter((eq) => eq.location === locationFilter);
    }

    return result;
  }, [equipments, typeFilter, statusFilter, locationFilter]);

  const selectedEquipment = equipments.find((eq) => eq.id === selectedEquipmentId);

  // 캔버스에 표시된 설비만 필터링 (positionX/Y가 0이 아닌 것)
  const canvasEquipments = useMemo(
    () => filteredEquipments.filter((eq) => eq.positionX !== 0 || eq.positionY !== 0),
    [filteredEquipments]
  );

  // 찾기 검색 결과 (캔버스에 표시된 설비 중에서 검색)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return canvasEquipments
      .filter(
        (eq) =>
          eq.name.toLowerCase().includes(query) ||
          eq.code.toLowerCase().includes(query)
      )
      .slice(0, 10); // 최대 10개만 표시
  }, [searchQuery, canvasEquipments]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * 설비 찾기 핸들러
   * @param equipmentId 찾을 설비 ID
   */
  const handleFindEquipment = (equipmentId: string) => {
    setFocusEquipmentId(equipmentId);
    setIsSearchDropdownOpen(false);
    setSearchQuery("");
  };

  /**
   * 엑셀 다운로드 핸들러
   * 현재 필터링된 설비 목록을 엑셀로 다운로드
   */
  const handleExportToExcel = useCallback(() => {
    if (filteredEquipments.length === 0) {
      alert("다운로드할 설비가 없습니다.");
      return;
    }

    // 엑셀 데이터 변환
    const excelData = filteredEquipments.map((eq) => ({
      "설비코드": eq.code,
      "설비명": eq.name,
      "타입": TYPE_CONFIG[eq.type]?.label || eq.type,
      "상태": STATUS_CONFIG[eq.status]?.label || eq.status,
      "라인": eq.lineCode || "",
      "위치": eq.location || "",
      "설명": eq.description || "",
      "제조사": eq.manufacturer || "",
      "모델번호": eq.modelNumber || "",
      "시리얼번호": eq.serialNumber || "",
      "구매일": eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString() : "",
      "보증종료일": eq.warrantyEndDate ? new Date(eq.warrantyEndDate).toLocaleDateString() : "",
      "IP주소": eq.ipAddress || "",
      "포트번호": eq.portNumber || "",
      "로그수집대상": eq.isLogTarget ? "Y" : "N",
      "로그수집경로": eq.logCollectionPath || "",
      "인터록대상": eq.isInterlockTarget ? "Y" : "N",
      "바코드사용": eq.isBarcodeEnabled ? "Y" : "N",
      "시스템타입": eq.systemType || "",
      "이미지URL": eq.imageUrl || "",
      "캔버스X좌표": eq.positionX,
      "캔버스Y좌표": eq.positionY,
      "생성일": new Date(eq.createdAt).toLocaleDateString(),
      "수정일": new Date(eq.updatedAt).toLocaleDateString(),
    }));

    // 워크시트 생성
    const worksheet = utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    worksheet["!cols"] = [
      { wch: 15 }, // 설비코드
      { wch: 25 }, // 설비명
      { wch: 12 }, // 타입
      { wch: 12 }, // 상태
      { wch: 15 }, // 라인
      { wch: 15 }, // 위치
      { wch: 40 }, // 설명
      { wch: 20 }, // 제조사
      { wch: 20 }, // 모델번호
      { wch: 20 }, // 시리얼번호
      { wch: 12 }, // 구매일
      { wch: 12 }, // 보증종료일
      { wch: 15 }, // IP주소
      { wch: 10 }, // 포트번호
      { wch: 12 }, // 로그수집대상
      { wch: 30 }, // 로그수집경로
      { wch: 12 }, // 인터록대상
      { wch: 12 }, // 바코드사용
      { wch: 15 }, // 시스템타입
      { wch: 40 }, // 이미지URL
      { wch: 12 }, // 캔버스X좌표
      { wch: 12 }, // 캔버스Y좌표
      { wch: 12 }, // 생성일
      { wch: 12 }, // 수정일
    ];

    // 워크북 생성 및 파일 저장
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "설비목록");

    // 파일명 생성 (프로젝트명_설비목록_날짜)
    const projectName = selectedProject?.name || "Project";
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `${projectName}_설비목록_${dateStr}.xlsx`;
    writeFile(workbook, fileName);
  }, [filteredEquipments, selectedProject]);

  // 프로젝트 미선택
  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col bg-background dark:bg-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-text-secondary mb-4" style={{ fontSize: 64 }}>
              folder_off
            </span>
            <h2 className="text-xl font-bold text-text dark:text-white mb-2">
              프로젝트를 선택해주세요
            </h2>
            <p className="text-text-secondary">
              좌측 사이드바에서 프로젝트를 선택하면 설비 관리를 시작할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 로딩
  if (isLoadingEquipments || isLoadingConnections) {
    return (
      <div className="h-full flex flex-col bg-background dark:bg-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">설비 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러
  if (equipmentsError) {
    return (
      <div className="h-full flex flex-col bg-background dark:bg-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-error mb-4" style={{ fontSize: 64 }}>
              error
            </span>
            <h2 className="text-xl font-bold text-text dark:text-white mb-2">
              데이터 로드 실패
            </h2>
            <p className="text-text-secondary">
              설비 정보를 불러오는 중 오류가 발생했습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 선택된 연결선 스타일 */}
      <style dangerouslySetInnerHTML={{ __html: edgeStyles }} />

      <div className="h-full flex flex-col bg-background dark:bg-background-dark">
        {/* 상단 툴바 */}
        <EquipmentToolbar
          selectedProject={selectedProject}
          equipmentCount={equipments.length}
          onExportToExcel={handleExportToExcel}
          hasData={filteredEquipments.length > 0}
        />

      {/* 메인 콘텐츠 (3단 구조) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 좌측: 설비 목록 (캔버스 보기일 때만 표시) */}
        {viewMode === "canvas" && (
          <>
            <div
              className={`transition-all duration-300 ease-in-out ${
                isLeftPanelOpen ? "w-96" : "w-0"
              }`}
            >
              {isLeftPanelOpen && (
                <EquipmentListPanel
                  equipments={filteredEquipments}
                  selectedId={selectedEquipmentId}
                  onSelectEquipment={setSelectedEquipmentId}
                  onClose={() => setIsLeftPanelOpen(false)}
                />
              )}
            </div>

            {/* 좌측 패널 토글 버튼 */}
            {!isLeftPanelOpen && (
              <button
                onClick={() => setIsLeftPanelOpen(true)}
                onMouseEnter={() => setIsLeftPanelOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-primary hover:bg-primary-hover text-white p-2 rounded-r-lg shadow-lg transition-all hover:scale-110"
                title="설비 목록 열기"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  chevron_right
                </span>
              </button>
            )}
          </>
        )}

        {/* 중앙: 캔버스/그리드 영역 - min-w-0으로 flex 오버플로우 방지 */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* 뷰 모드 선택 바 */}
          <div className="px-4 py-2 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark flex items-center gap-4 shrink-0">
            {/* 뷰 모드 선택 */}
            <div className="flex items-center gap-1 p-1 bg-background-white dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white hover:bg-surface dark:hover:bg-surface-dark"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  table_chart
                </span>
                <span>그리드 보기</span>
              </button>
              <button
                onClick={() => setViewMode("canvas")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "canvas"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white hover:bg-surface dark:hover:bg-surface-dark"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  hub
                </span>
                <span>캔버스 보기</span>
              </button>
            </div>

          </div>

          {/* 필터 바 */}
          <div className="px-4 py-2 bg-background-white dark:bg-background-dark border-b border-border dark:border-border-dark flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                filter_alt
              </span>
              <span className="text-sm font-medium text-text dark:text-white">필터</span>
            </div>

            {/* 라인 필터 */}
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">전체 라인</option>
              {uniqueLines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>

            {/* 타입 필터 */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EquipmentType | "ALL")}
              className="px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">전체 타입</option>
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | "ALL")}
              className="px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">전체 상태</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* 위치 필터 */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">전체 위치</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>

            {/* 필터 초기화 버튼 */}
            {(lineFilter !== "ALL" || typeFilter !== "ALL" || statusFilter !== "ALL" || locationFilter !== "ALL") && (
              <button
                onClick={() => {
                  setLineFilter("ALL");
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                  setLocationFilter("ALL");
                }}
                className="px-3 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error text-sm font-medium transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  close
                </span>
                초기화
              </button>
            )}

            {/* 구분선 */}
            <div className="h-6 w-px bg-border dark:bg-border-dark"></div>

            {/* 설비 찾기 */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-500" style={{ fontSize: 20 }}>
                  search
                </span>
                <span className="text-sm font-medium text-text dark:text-white">찾기</span>
              </div>
            </div>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="설비명 또는 코드 입력..."
                className="w-48 px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {/* 검색 결과 드롭다운 */}
              {isSearchDropdownOpen && searchResults.length > 0 && (
                <div
                  ref={searchDropdownRef}
                  className="absolute left-0 top-full mt-1 z-50 w-72 max-h-64 overflow-y-auto bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-xl"
                >
                  <div className="p-2 border-b border-border dark:border-border-dark">
                    <span className="text-xs text-text-secondary">
                      캔버스 내 {searchResults.length}개 설비 발견
                    </span>
                  </div>
                  {searchResults.map((eq) => (
                    <button
                      key={eq.id}
                      onClick={() => handleFindEquipment(eq.id)}
                      className="w-full px-3 py-2 text-left hover:bg-surface dark:hover:bg-background-dark transition-colors flex items-center gap-3 border-b border-border/50 dark:border-border-dark/50 last:border-b-0"
                    >
                      <span className="material-symbols-outlined text-cyan-500" style={{ fontSize: 18 }}>
                        location_on
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text dark:text-white truncate">
                          {eq.name}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {eq.code} · {eq.lineCode || "라인 없음"}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: 16 }}>
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {/* 검색어 입력했지만 결과 없음 */}
              {isSearchDropdownOpen && searchQuery.trim() && searchResults.length === 0 && (
                <div
                  ref={searchDropdownRef}
                  className="absolute left-0 top-full mt-1 z-50 w-72 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-xl p-4 text-center"
                >
                  <span className="material-symbols-outlined text-text-secondary mb-2" style={{ fontSize: 32 }}>
                    search_off
                  </span>
                  <p className="text-sm text-text-secondary">
                    캔버스에서 "{searchQuery}" 설비를 찾을 수 없습니다.
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    좌측 목록에서 캔버스로 드래그해주세요.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* 뷰 모드별 콘텐츠 */}
          {viewMode === "grid" ? (
            // 그리드 보기
            <div className="flex-1 overflow-auto p-4 min-w-0">
              <EquipmentGridView
                equipments={filteredEquipments.slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage
                )}
                totalCount={filteredEquipments.length}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(count) => {
                  setItemsPerPage(count);
                  setCurrentPage(1);
                }}
                onEdit={(eq) => {
                  // 수정 모달 열기
                  setEditModalState({
                    isOpen: true,
                    equipment: eq,
                  });
                }}
                onViewInCanvas={(eq) => {
                  // 캔버스 뷰로 전환하고 해당 설비 선택
                  setViewMode("canvas");
                  setSelectedEquipmentId(eq.id);
                  setFocusEquipmentId(eq.id);
                  // 해당 설비의 라인으로 필터 설정
                  if (eq.lineCode) {
                    setLineFilter(eq.lineCode);
                  }
                }}
                onDelete={async (eq) => {
                  if (confirm(`설비 "${eq.name}"을 삭제하시겠습니까?`)) {
                    try {
                      const res = await fetch(`/api/equipment/${eq.id}`, {
                        method: "DELETE",
                      });
                      if (res.ok) {
                        // 데이터 다시 로드 (React Query 자동 처리)
                        alert("설비가 삭제되었습니다.");
                      } else {
                        const error = await res.json();
                        alert(`삭제 실패: ${error.message || "알 수 없는 오류"}`);
                      }
                    } catch (error) {
                      console.error("설비 삭제 오류:", error);
                      alert("설비 삭제 중 오류가 발생했습니다.");
                    }
                  }
                }}
                onStatusChange={async (id, newStatus) => {
                  try {
                    const res = await fetch(`/api/equipment/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: newStatus }),
                    });
                    if (!res.ok) {
                      const error = await res.json();
                      alert(`상태 변경 실패: ${error.message || "알 수 없는 오류"}`);
                    }
                  } catch (error) {
                    console.error("상태 변경 오류:", error);
                    alert("상태 변경 중 오류가 발생했습니다.");
                  }
                }}
                isLoading={isLoadingEquipments}
              />
            </div>
          ) : (
            // 캔버스 보기
            <>
              <EquipmentCanvas
                equipments={filteredEquipments}
                connections={connections}
                selectedId={selectedEquipmentId}
                onSelectNode={setSelectedEquipmentId}
                focusEquipmentId={focusEquipmentId}
                onFocusComplete={() => setFocusEquipmentId(null)}
              />
            </>
          )}
        </div>

        {/* 우측: 설비 상세 사이드바 (캔버스 보기일 때만 표시) */}
        {viewMode === "canvas" && selectedEquipment && (
          <EquipmentSidebar
            equipment={selectedEquipment}
            onClose={() => setSelectedEquipmentId(null)}
          />
        )}
      </div>

      {/* 설비 수정 모달 */}
      <EquipmentModal
        isOpen={editModalState.isOpen}
        mode="edit"
        projectId={selectedProjectId || ""}
        equipment={editModalState.equipment}
        onClose={() => setEditModalState({ isOpen: false, equipment: null })}
      />
      </div>
    </>
  );
}
