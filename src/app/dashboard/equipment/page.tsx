/**
 * @file src/app/dashboard/equipment/page.tsx
 * @description
 * 설비 관리 메인 페이지 - React Flow 기반 노드 캔버스
 *
 * 초보자 가이드:
 * 1. **EquipmentToolbar**: 상단 툴바 (제목, 프로젝트 정보, 새 설비 추가)
 * 2. **필터 바**: 사업부, 라인 필터링 (캔버스 상단)
 *    - 라인 선택 필수: 성능 최적화를 위해 라인을 선택해야 설비 표시
 * 3. **EquipmentCanvas**: 중앙 캔버스 (노드 + 연결선)
 * 4. **EquipmentListPanel**: 좌측 설비 목록
 * 5. **EquipmentSidebar**: 우측 사이드바 (선택한 설비 편집)
 *
 * 수정 방법:
 * - 레이아웃 변경: className 수정
 * - 필터 추가: uniqueDivisions, uniqueLines에 필터 옵션 추가
 * - 추가 기능: 컴포넌트 추가
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useProject } from "@/contexts";
import { useEquipment } from "./hooks/useEquipment";
import { useEquipmentConnections } from "./hooks/useEquipmentConnections";
import {
  EquipmentToolbar,
  EquipmentCanvas,
  EquipmentSidebar,
  EquipmentListPanel,
} from "./components";

/**
 * 설비 관리 페이지
 */
export default function EquipmentPage() {
  const { selectedProjectId, selectedProject } = useProject();
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // 필터 상태 (초기값: 선택 안 됨)
  const [divisionFilter, setDivisionFilter] = useState<string>("ALL");
  const [lineFilter, setLineFilter] = useState<string>(""); // 빈 문자열: 선택 안 됨

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

  // 데이터 조회
  const {
    data: equipments = [],
    isLoading: isLoadingEquipments,
    error: equipmentsError,
  } = useEquipment({ projectId: selectedProjectId || undefined });

  const {
    data: connections = [],
    isLoading: isLoadingConnections,
  } = useEquipmentConnections({ projectId: selectedProjectId || undefined });

  // 고유 사업부, 라인 목록 추출 (타입 가드로 null/undefined 제외)
  const uniqueDivisions = Array.from(
    new Set(equipments.map((eq) => eq.divisionCode).filter((x): x is string => Boolean(x)))
  );
  const uniqueLines = Array.from(
    new Set(equipments.map((eq) => eq.lineCode).filter((x): x is string => Boolean(x)))
  );

  // 필터링된 설비 목록 (라인 선택 필수)
  const filteredEquipments = !lineFilter
    ? [] // 라인 미선택 시 빈 배열
    : equipments.filter((eq) => {
        if (divisionFilter !== "ALL" && eq.divisionCode !== divisionFilter) {
          return false;
        }
        if (lineFilter !== "ALL" && eq.lineCode !== lineFilter) {
          return false;
        }
        return true;
      });

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
        />

      {/* 메인 콘텐츠 (3단 구조) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 좌측: 설비 목록 (토글 가능) */}
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

        {/* 중앙: 캔버스 영역 */}
        <div className="flex-1 flex flex-col relative">
          {/* 필터 바 */}
          <div className="px-4 py-3 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                filter_alt
              </span>
              <span className="text-sm font-medium text-text dark:text-white">필터</span>
            </div>

            {/* 사업부 필터 */}
            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setLineFilter(""); // 사업부 변경 시 라인 선택 해제
              }}
              className="px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">전체 사업부 ({equipments.length})</option>
              {uniqueDivisions.map((division) => (
                <option key={division} value={division}>
                  {division} ({equipments.filter((eq) => eq.divisionCode === division).length})
                </option>
              ))}
            </select>

            {/* 라인 필터 (필수 선택) */}
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-lg bg-background-white dark:bg-background-dark border text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                !lineFilter
                  ? "border-warning text-warning font-medium"
                  : "border-border dark:border-border-dark text-text dark:text-white"
              }`}
            >
              <option value="" disabled>
                ⚠️ 라인을 선택하세요
              </option>
              <option value="ALL">
                전체 라인 (
                {divisionFilter === "ALL"
                  ? equipments.length
                  : equipments.filter((eq) => eq.divisionCode === divisionFilter).length}
                )
              </option>
              {uniqueLines
                .filter((line) => {
                  // 사업부 필터링된 경우 해당 사업부의 라인만 표시
                  if (divisionFilter === "ALL") return true;
                  return equipments.some(
                    (eq) => eq.lineCode === line && eq.divisionCode === divisionFilter
                  );
                })
                .map((line) => (
                  <option key={line} value={line}>
                    {line} (
                    {
                      equipments.filter((eq) => {
                        if (divisionFilter === "ALL") return eq.lineCode === line;
                        return eq.lineCode === line && eq.divisionCode === divisionFilter;
                      }).length
                    }
                    )
                  </option>
                ))}
            </select>

            {/* 필터 초기화 버튼 */}
            {(divisionFilter !== "ALL" || (lineFilter && lineFilter !== "ALL")) && (
              <button
                onClick={() => {
                  setDivisionFilter("ALL");
                  setLineFilter(""); // 빈 문자열로 초기화
                }}
                className="px-3 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error text-sm font-medium transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  close
                </span>
                필터 초기화
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
                disabled={!lineFilter}
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

            {/* 필터링 결과 표시 */}
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-text-secondary">표시:</span>
              <span className="font-semibold text-primary">
                {filteredEquipments.length}
              </span>
              <span className="text-text-secondary">/</span>
              <span className="text-text-secondary">{equipments.length}</span>
            </div>
          </div>

          {/* 캔버스 */}
          {!lineFilter ? (
            // 라인 미선택 시 안내 메시지
            <div className="flex-1 flex items-center justify-center bg-surface dark:bg-background-dark">
              <div className="text-center">
                <span className="material-symbols-outlined text-warning mb-4" style={{ fontSize: 64 }}>
                  linear_scale
                </span>
                <h2 className="text-xl font-bold text-text dark:text-white mb-2">
                  라인을 선택해주세요
                </h2>
                <p className="text-text-secondary mb-4">
                  상단의 라인 필터에서 보려는 라인을 선택하세요.
                </p>
                <p className="text-sm text-warning">
                  ⚠️ 모든 라인을 한 번에 표시하면 성능이 저하될 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <EquipmentCanvas
              equipments={filteredEquipments}
              connections={connections}
              selectedId={selectedEquipmentId}
              onSelectNode={setSelectedEquipmentId}
              focusEquipmentId={focusEquipmentId}
              onFocusComplete={() => setFocusEquipmentId(null)}
            />
          )}
        </div>

        {/* 우측: 설비 상세 사이드바 */}
        {selectedEquipment && (
          <EquipmentSidebar
            equipment={selectedEquipment}
            onClose={() => setSelectedEquipmentId(null)}
          />
        )}
      </div>
      </div>
    </>
  );
}
