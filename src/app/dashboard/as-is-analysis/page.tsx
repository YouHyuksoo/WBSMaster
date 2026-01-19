/**
 * @file src/app/dashboard/as-is-analysis/page.tsx
 * @description
 * AS-IS 현행 분석 시스템의 메인 페이지입니다.
 * 좌우 분할 레이아웃으로 업무 목록과 상세 분석을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **좌측 패널**: 업무 목록 (TaskListPanel)
 * 2. **우측 메인 영역**: 탭 전환 (총괄 / 단위업무)
 *    - 총괄: OverviewTable (업무 분류 체계)
 *    - 단위업무: UnitAnalysisPanel (상세 분석)
 *
 * 레이아웃:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    헤더 (프로젝트 정보)                       │
 * ├────────────┬────────────────────────────────────────────────┤
 * │  좌측 패널  │            우측 메인 영역                       │
 * │ TaskList   │   [탭: 총괄 | 단위업무]                          │
 * │ - 업무목록  │   총괄: OverviewTable                           │
 * │ - 검색     │   단위: UnitAnalysisPanel                       │
 * └────────────┴────────────────────────────────────────────────┘
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Icon, Button } from "@/components/ui";
import { BUSINESS_UNITS, type BusinessUnit } from "@/constants/business-units";
import { OverviewHeader } from "./components/OverviewHeader";
import { OverviewTable } from "./components/OverviewTable";
import { TaskListPanel } from "./components/TaskListPanel";
import { UnitAnalysisPanel } from "./components/UnitAnalysisPanel";
import { WritingGuideModal } from "./components/WritingGuideModal";
import { useAsIsOverview } from "./hooks/useAsIsOverview";
import type { AsIsOverviewItem } from "./types";

/** 탭 타입 */
type TabType = "overview" | "unit";

/**
 * AS-IS 분석 메인 페이지 컴포넌트
 */
export default function AsIsAnalysisPage() {
  const { selectedProject } = useProject();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedItem, setSelectedItem] = useState<AsIsOverviewItem | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit>("V_IVI");
  // 좌측 패널 접기 상태
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isLeftPanelHovered, setIsLeftPanelHovered] = useState(false);
  // 작성가이드 모달 상태
  const [showGuideModal, setShowGuideModal] = useState(false);

  // AS-IS 총괄 데이터 조회 (프로젝트+사업부별)
  const {
    overview,
    isLoading,
    error,
    refetch,
    createOverview,
    isCreating,
  } = useAsIsOverview(selectedProject?.id, businessUnit);

  // 사업부 변경 시 선택 항목 초기화
  useEffect(() => {
    setSelectedItem(null);
    setActiveTab("overview");
  }, [businessUnit]);

  // 항목 선택 핸들러
  const handleSelectItem = useCallback((item: AsIsOverviewItem) => {
    setSelectedItem(item);
    setActiveTab("unit");
  }, []);

  // 리사이즈 핸들러
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.min(Math.max(200, e.clientX), 500);
    setLeftPanelWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 리사이즈 이벤트 등록
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 프로젝트 미선택 시 안내
  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark">
          <Icon name="folder_off" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary text-lg font-medium mb-2">
            프로젝트를 선택해주세요
          </p>
          <p className="text-text-secondary text-sm">
            AS-IS 분석을 위해 먼저 프로젝트를 선택해야 합니다
          </p>
        </div>
      </div>
    );
  }

  // 총괄 데이터가 없을 때 생성 안내
  if (!isLoading && !error && !overview) {
    return (
      <div className="p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="analytics" className="text-[#00f3ff]" />
              <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
                AS-IS ANALYSIS
              </span>
              <span className="text-slate-400 text-sm font-normal ml-1">
                / 현행 분석
              </span>
            </h1>
            <p className="text-text-secondary mt-1">
              MES 프로젝트의 현행(AS-IS) 업무 분석 템플릿
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 사업부 선택 */}
            <select
              value={businessUnit}
              onChange={(e) => setBusinessUnit(e.target.value as BusinessUnit)}
              className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              {BUSINESS_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {/* 프로젝트 배지 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">
                {selectedProject.name}
              </span>
            </div>
          </div>
        </div>

        {/* 생성 안내 */}
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Icon name="add_chart" size="xl" className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-text dark:text-white mb-2">
            AS-IS 분석 시작하기
          </h2>
          <p className="text-text-secondary text-center max-w-md mb-4">
            <span className="font-semibold text-primary">{businessUnit}</span> 사업부의 AS-IS 분석 데이터가 없습니다.
            <br />
            새로운 AS-IS 분석을 시작하려면 아래 버튼을 클릭하세요.
          </p>
          <Button
            variant="primary"
            size="lg"
            leftIcon="add"
            onClick={() => createOverview({ projectId: selectedProject.id, businessUnit })}
            isLoading={isCreating}
          >
            {businessUnit} AS-IS 분석 생성
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-border dark:border-border-dark bg-background-white dark:bg-background-dark">
        <OverviewHeader
          projectName={selectedProject.name}
          overview={overview}
          businessUnit={businessUnit}
          onBusinessUnitChange={setBusinessUnit}
          onRefresh={refetch}
          onShowGuide={() => setShowGuideModal(true)}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 좌측 패널: 업무 목록 */}
        {!isLeftPanelCollapsed ? (
          <>
            <div
              style={{ width: leftPanelWidth }}
              className="flex-shrink-0 border-r border-border dark:border-border-dark bg-surface dark:bg-surface-dark overflow-hidden"
            >
              {/* 패널 헤더 (접기 버튼 포함) */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border dark:border-border-dark">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  업무 목록
                </span>
                <button
                  onClick={() => setIsLeftPanelCollapsed(true)}
                  className="p-1 rounded hover:bg-background-dark/10 dark:hover:bg-white/10 transition-colors"
                  title="패널 접기"
                >
                  <Icon name="chevron_left" size="xs" className="text-text-secondary" />
                </button>
              </div>
              <TaskListPanel
                items={overview?.items || []}
                selectedItem={selectedItem}
                onSelectItem={handleSelectItem}
                isLoading={isLoading}
              />
            </div>

            {/* 리사이즈 핸들 */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-1 cursor-col-resize hover:bg-primary/50 transition-colors ${
                isResizing ? "bg-primary" : "bg-transparent"
              }`}
            />
          </>
        ) : (
          <>
            {/* 접힌 상태: 핸들 바 */}
            <div
              className="w-6 flex-shrink-0 bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark flex flex-col items-center cursor-pointer hover:bg-primary/5 transition-colors"
              onMouseEnter={() => setIsLeftPanelHovered(true)}
              onMouseLeave={() => setIsLeftPanelHovered(false)}
              onClick={() => setIsLeftPanelCollapsed(false)}
              title="패널 펼치기"
            >
              <div className="mt-3">
                <Icon name="chevron_right" size="xs" className="text-text-secondary" />
              </div>
              {/* 세로 텍스트 */}
              <div className="mt-4 writing-mode-vertical text-[10px] font-medium text-text-secondary tracking-widest"
                   style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                업무목록
              </div>
            </div>

            {/* 호버 시 패널 표시 (오버레이) */}
            {isLeftPanelHovered && (
              <div
                className="absolute left-6 top-0 bottom-0 z-40 shadow-xl"
                style={{ width: leftPanelWidth }}
                onMouseEnter={() => setIsLeftPanelHovered(true)}
                onMouseLeave={() => setIsLeftPanelHovered(false)}
              >
                <div className="h-full bg-surface dark:bg-surface-dark border-r border-border dark:border-border-dark overflow-hidden">
                  {/* 패널 헤더 */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border dark:border-border-dark">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      업무 목록
                    </span>
                    <button
                      onClick={() => setIsLeftPanelCollapsed(false)}
                      className="p-1 rounded hover:bg-background-dark/10 dark:hover:bg-white/10 transition-colors"
                      title="패널 고정"
                    >
                      <Icon name="push_pin" size="xs" className="text-text-secondary" />
                    </button>
                  </div>
                  <TaskListPanel
                    items={overview?.items || []}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* 우측 메인 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background-white dark:bg-background-dark">
          {/* 탭 */}
          <div className="flex items-center gap-1 p-3 border-b border-border dark:border-border-dark">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-secondary hover:text-text dark:hover:text-white hover:bg-surface dark:hover:bg-surface-dark"
              }`}
            >
              <Icon name="table_chart" size="xs" />
              <span>총괄</span>
            </button>
            <button
              onClick={() => setActiveTab("unit")}
              disabled={!selectedItem}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "unit"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : selectedItem
                  ? "text-text-secondary hover:text-text dark:hover:text-white hover:bg-surface dark:hover:bg-surface-dark"
                  : "text-text-secondary/50 cursor-not-allowed"
              }`}
            >
              <Icon name="schema" size="xs" />
              <span>단위업무</span>
              {selectedItem && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                  {selectedItem.taskName}
                </span>
              )}
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-auto">
            {activeTab === "overview" ? (
              <OverviewTable
                overview={overview}
                items={overview?.items || []}
                onSelectItem={handleSelectItem}
                selectedItem={selectedItem}
              />
            ) : (
              <UnitAnalysisPanel
                item={selectedItem}
                onBack={() => setActiveTab("overview")}
              />
            )}
          </div>
        </div>
      </div>

      {/* 작성가이드 모달 */}
      {showGuideModal && (
        <WritingGuideModal onClose={() => setShowGuideModal(false)} />
      )}
    </div>
  );
}
