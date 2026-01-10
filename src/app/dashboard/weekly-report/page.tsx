/**
 * @file src/app/dashboard/weekly-report/page.tsx
 * @description
 * 주간 업무보고 페이지입니다.
 * 두 가지 뷰 모드를 지원합니다:
 * 1. **목록 뷰**: 모든 멤버의 주간보고를 테이블로 표시
 * 2. **상세 뷰**: 개별 주간보고 등록/수정 화면
 *
 * 초보자 가이드:
 * 1. **ViewMode**: 'list' | 'detail' 상태로 뷰 전환 관리
 * 2. **ReportListView**: 목록 테이블 컴포넌트
 * 3. **ReportDetailView**: 등록/수정 화면 컴포넌트
 * 4. **상태 관리**: selectedReport와 initialWeekInfo로 상세 뷰 모드 결정
 *
 * @example
 * - 목록에서 행 클릭 → 해당 보고서 수정 모드로 상세 뷰 전환
 * - "주간보고 작성" 버튼 클릭 → 새 작성 모드로 상세 뷰 전환
 * - 상세 뷰에서 뒤로가기 → 목록 뷰로 복귀
 */

"use client";

import React, { useState } from "react";
import { ReportListView, ReportDetailView } from "./components";
import { ViewMode, WeekInfo, ReportWithRelations } from "./types";

/**
 * 주간 업무보고 페이지
 * 목록 뷰와 상세 뷰를 전환하며 주간보고를 관리합니다.
 */
export default function WeeklyReportPage() {
  // 뷰 모드 상태: 'list' (목록) 또는 'detail' (상세/등록/수정)
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 선택된 보고서 (수정 모드에서 사용)
  const [selectedReport, setSelectedReport] = useState<ReportWithRelations | null>(null);

  // 초기 주차 정보 (새 작성 모드에서 사용)
  const [initialWeekInfo, setInitialWeekInfo] = useState<WeekInfo | null>(null);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* 페이지 타이틀 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">주간 업무보고</h1>
        </div>

        {/* 뷰 전환 */}
        {viewMode === "list" ? (
          <ReportListView
            onSelectReport={handleSelectReport}
            onCreateNew={handleCreateNew}
          />
        ) : (
          <ReportDetailView
            selectedReport={selectedReport}
            initialWeekInfo={initialWeekInfo}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
