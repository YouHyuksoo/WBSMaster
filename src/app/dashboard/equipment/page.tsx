/**
 * @file src/app/dashboard/equipment/page.tsx
 * @description
 * 설비 관리 메인 페이지 - React Flow 기반 노드 캔버스
 *
 * 초보자 가이드:
 * 1. **EquipmentToolbar**: 상단 툴바 (제목, 프로젝트 정보, 새 설비 추가)
 * 2. **EquipmentCanvas**: 중앙 캔버스 (노드 + 연결선)
 * 3. **EquipmentSidebar**: 우측 사이드바 (선택한 설비 편집)
 *
 * 수정 방법:
 * - 레이아웃 변경: className 수정
 * - 추가 기능: 컴포넌트 추가
 */

"use client";

import { useState } from "react";
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

    /* 선택된 노드 스타일 강화 */
    .react-flow__node.selected {
      box-shadow: 0 0 0 2px #00f3ff, 0 0 20px rgba(0, 243, 255, 0.3) !important;
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

  const selectedEquipment = equipments.find((eq) => eq.id === selectedEquipmentId);

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
            isLeftPanelOpen ? "w-80" : "w-0"
          }`}
        >
          {isLeftPanelOpen && (
            <EquipmentListPanel
              equipments={equipments}
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

        {/* 중앙: 캔버스 */}
        <EquipmentCanvas
          equipments={equipments}
          connections={connections}
          selectedId={selectedEquipmentId}
          onSelectNode={setSelectedEquipmentId}
        />

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
