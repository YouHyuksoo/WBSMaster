/**
 * @file src/app/dashboard/equipment/components/EquipmentToolbar.tsx
 * @description
 * 설비 관리 상단 툴바 컴포넌트
 * 제목, 프로젝트 정보, 설비 추가 버튼 등을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **헤더**: 페이지 제목 및 설명
 * 2. **프로젝트 배지**: 선택된 프로젝트 표시
 * 3. **새 설비 추가**: 모달 열기 버튼
 *
 * 수정 방법:
 * - 버튼 추가: 우측 버튼 그룹에 추가
 * - 통계 표시: equipmentCount 활용
 */

"use client";

import { useState } from "react";
import { Project } from "@/lib/api";
import { AddEquipmentModal } from "./AddEquipmentModal";

/** Props 타입 */
interface EquipmentToolbarProps {
  selectedProject: Project | null;
  equipmentCount: number;
  onExportToExcel: () => void;
  hasData: boolean;
}

/**
 * 설비 관리 툴바 컴포넌트
 */
export function EquipmentToolbar({
  selectedProject,
  equipmentCount,
  onExportToExcel,
  hasData,
}: EquipmentToolbarProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="p-6 border-b border-border dark:border-border-dark bg-background-white dark:bg-surface-dark">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 좌측: 제목 */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00f3ff]">
              precision_manufacturing
            </span>
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              EQUIPMENT
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 설비 관리
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            설비를 캔버스에 배치하고 연결 관계를 관리합니다.
          </p>
        </div>

        {/* 우측: 프로젝트 배지 + 버튼 */}
        <div className="flex items-center gap-3">
          {/* 프로젝트 배지 */}
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                folder
              </span>
              <span className="text-sm font-medium text-primary">
                {selectedProject.name}
              </span>
            </div>
          )}

          {/* 설비 개수 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark">
            <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: 18 }}>
              inventory_2
            </span>
            <span className="text-sm font-medium text-text dark:text-white">
              {equipmentCount}개
            </span>
          </div>

          {/* 엑셀 다운로드 버튼 */}
          <button
            onClick={onExportToExcel}
            disabled={!hasData}
            className="flex items-center gap-2 px-4 py-2 bg-background-white dark:bg-surface-dark hover:bg-surface dark:hover:bg-background-dark border border-border dark:border-border-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="엑셀 다운로드"
          >
            <span className="material-symbols-outlined text-success" style={{ fontSize: 18 }}>
              download
            </span>
            <span className="text-sm font-medium text-text dark:text-white">엑셀 다운로드</span>
          </button>

          {/* 새 설비 추가 버튼 */}
          <button
            onClick={() => {
              if (!selectedProject) {
                alert("프로젝트를 먼저 선택해주세요.");
                return;
              }
              setShowAddModal(true);
            }}
            disabled={!selectedProject}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            <span className="text-sm font-medium">새 설비 추가</span>
          </button>
        </div>
      </div>

      {/* 설비 추가 모달 */}
      {showAddModal && selectedProject && (
        <AddEquipmentModal
          projectId={selectedProject.id}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
