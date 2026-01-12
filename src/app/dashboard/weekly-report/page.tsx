/**
 * @file src/app/dashboard/weekly-report/page.tsx
 * @description
 * 주간 업무보고 페이지입니다.
 * 두 가지 뷰 모드를 지원합니다:
 * 1. **목록 뷰**: 모든 멤버의 주간보고를 테이블로 표시
 * 2. **상세 뷰**: 개별 주간보고 등록/수정 화면
 * 3. **취합 패널**: 우측에 취합 보고서 목록 (목록 뷰에서만 표시)
 *
 * 초보자 가이드:
 * 1. **ViewMode**: 'list' | 'detail' 상태로 뷰 전환 관리
 * 2. **ReportListView**: 목록 테이블 컴포넌트
 * 3. **ReportDetailView**: 등록/수정 화면 컴포넌트
 * 4. **SummaryPanel**: 취합 보고서 리스트 (우측) - 클릭 시 취합 페이지로 이동
 * 5. **SummaryModal**: 취합 생성 모달
 *
 * @example
 * - 목록에서 행 클릭 → 해당 보고서 수정 모드로 상세 뷰 전환
 * - "주간보고 작성" 버튼 클릭 → 새 작성 모드로 상세 뷰 전환
 * - "새 취합" 버튼 클릭 → 취합 모달 열기
 * - 취합 보고서 클릭 → /dashboard/weekly-report/summary/[id] 페이지로 이동
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  ReportListView,
  ReportDetailView,
  SummaryPanel,
  SummaryModal,
} from "./components";
import { ViewMode, WeekInfo, ReportWithRelations } from "./types";
import { useProject } from "@/contexts";
import { getProjectWeekInfo } from "./constants";

/**
 * 주간 업무보고 페이지
 * 목록 뷰와 상세 뷰를 전환하며 주간보고를 관리합니다.
 */
export default function WeeklyReportPage() {
  const { selectedProject, selectedProjectId } = useProject();

  // 뷰 모드 상태: 'list' (목록) 또는 'detail' (상세/등록/수정)
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 선택된 보고서 (수정 모드에서 사용)
  const [selectedReport, setSelectedReport] = useState<ReportWithRelations | null>(null);

  // 초기 주차 정보 (새 작성 모드에서 사용)
  const [initialWeekInfo, setInitialWeekInfo] = useState<WeekInfo | null>(null);

  // 취합 모달 상태 (새 취합 생성용)
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // 현재 주차 정보 (프로젝트 시작일 기준)
  const currentWeekInfo = useMemo(() => {
    if (selectedProject?.startDate) {
      return getProjectWeekInfo(new Date(), new Date(selectedProject.startDate));
    }
    return null;
  }, [selectedProject?.startDate]);

  /**
   * 보고서 선택 핸들러
   * 목록에서 행 클릭 시 해당 보고서 수정 모드로 전환
   */
  const handleSelectReport = (report: ReportWithRelations) => {
    setSelectedReport(report);
    setInitialWeekInfo(null);
    setViewMode("detail");
  };

  /**
   * 새 보고서 작성 핸들러
   * 주간보고 작성 버튼 클릭 시 새 작성 모드로 전환
   */
  const handleCreateNew = (weekInfo: WeekInfo) => {
    setSelectedReport(null);
    setInitialWeekInfo(weekInfo);
    setViewMode("detail");
  };

  /**
   * 목록으로 돌아가기 핸들러
   * 상세 뷰에서 뒤로가기 클릭 시 목록 뷰로 복귀
   */
  const handleBack = () => {
    setSelectedReport(null);
    setInitialWeekInfo(null);
    setViewMode("list");
  };

  /**
   * 새 취합 생성 모달 열기
   */
  const handleCreateSummary = () => {
    setShowSummaryModal(true);
  };

  /**
   * 취합 모달 닫기
   */
  const handleCloseSummaryModal = () => {
    setShowSummaryModal(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-full mx-auto">
        {/* 뷰 전환 */}
        {viewMode === "list" ? (
          <div className="flex gap-6">
            {/* 메인 목록 영역 */}
            <div className="flex-1 min-w-0">
              <ReportListView
                onSelectReport={handleSelectReport}
                onCreateNew={handleCreateNew}
              />
            </div>

            {/* 취합 패널 (프로젝트 선택 시만 표시) */}
            {selectedProjectId && (
              <div className="w-80 shrink-0">
                <SummaryPanel
                  projectId={selectedProjectId}
                  onCreateNew={handleCreateSummary}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <ReportDetailView
              selectedReport={selectedReport}
              initialWeekInfo={initialWeekInfo}
              onBack={handleBack}
            />
          </div>
        )}
      </div>

      {/* 취합 생성 모달 (프로젝트 선택 및 주차 정보 있을 때만) */}
      {selectedProjectId && currentWeekInfo && (
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={handleCloseSummaryModal}
          projectId={selectedProjectId}
          summary={null}
          weekInfo={currentWeekInfo}
        />
      )}
    </div>
  );
}
