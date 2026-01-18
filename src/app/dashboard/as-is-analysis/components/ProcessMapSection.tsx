/**
 * @file src/app/dashboard/as-is-analysis/components/ProcessMapSection.tsx
 * @description
 * 업무 프로세스 맵 섹션 컴포넌트입니다.
 * Flow Chart와 Swimlane 다이어그램을 탭으로 전환하여 표시합니다.
 *
 * 초보자 가이드:
 * 1. **Flow Chart 탭**: 일반 흐름도
 * 2. **Swimlane 탭**: 담당자별 레인 구분 흐름도
 * 3. **ReactFlow 캔버스**: 드래그앤드롭 편집
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { FlowChartCanvas } from "./FlowChartCanvas";
import { SwimlaneCanvas } from "./SwimlaneCanvas";
import type { AsIsUnitAnalysis, FlowChartData, SwimlaneData } from "../types";

interface ProcessMapSectionProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
  /** Flow Chart 저장 핸들러 */
  onSaveFlowChart?: (data: FlowChartData) => void;
  /** Swimlane 저장 핸들러 */
  onSaveSwimlane?: (data: SwimlaneData) => void;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}

type MapTab = "flowchart" | "swimlane";

/**
 * 업무 프로세스 맵 섹션 컴포넌트
 */
export function ProcessMapSection({
  unitAnalysis,
  onSaveFlowChart,
  onSaveSwimlane,
  readOnly = false,
}: ProcessMapSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<MapTab>("flowchart");

  // 디버깅: props 확인
  console.log("[ProcessMapSection] props:", {
    hasOnSaveFlowChart: !!onSaveFlowChart,
    hasOnSaveSwimlane: !!onSaveSwimlane,
    readOnly,
    unitAnalysisId: unitAnalysis?.id
  });

  return (
    <div className={`rounded-xl border ${SECTION_STYLES.processMap.borderColor} ${SECTION_STYLES.processMap.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-green-200 dark:border-green-800">
        <SectionHeader
          style={SECTION_STYLES.processMap}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          rightElement={
            <div className="flex items-center gap-2">
              {/* 탭 */}
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-1 border border-green-200 dark:border-green-800">
                <button
                  onClick={() => setActiveTab("flowchart")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "flowchart"
                      ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                      : "text-text-secondary hover:text-text dark:hover:text-white"
                  }`}
                >
                  <Icon name="account_tree" size="xs" />
                  Flow Chart
                </button>
                <button
                  onClick={() => setActiveTab("swimlane")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "swimlane"
                      ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                      : "text-text-secondary hover:text-text dark:hover:text-white"
                  }`}
                >
                  <Icon name="view_column" size="xs" />
                  Swimlane
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* 캔버스 */}
      {!isCollapsed && (
        <div className="h-[500px]">
          {activeTab === "flowchart" ? (
            <FlowChartCanvas
              initialData={unitAnalysis.flowChartData}
              onSave={onSaveFlowChart}
              readOnly={readOnly}
            />
          ) : (
            <SwimlaneCanvas
              initialData={unitAnalysis.swimlaneData}
              onSave={onSaveSwimlane}
              readOnly={readOnly}
            />
          )}
        </div>
      )}

      {/* Flow Chart 상세 테이블 */}
      {!isCollapsed && (
        <div className="p-4 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="table_chart" size="xs" className="text-text-secondary" />
            <span className="text-sm font-medium text-text dark:text-white">
              프로세스 상세
            </span>
            <span className="text-xs text-text-secondary">
              (다이어그램과 연동됩니다)
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-green-200 dark:border-green-800 overflow-hidden">
            {(unitAnalysis.flowChartDetails || []).length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-text-secondary">
                  다이어그램에 노드를 추가하면 자동으로 상세 정보가 연동됩니다
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50 dark:bg-green-900/20 text-xs font-semibold text-text-secondary uppercase">
                    <th className="px-4 py-2 text-left w-16">순번</th>
                    <th className="px-4 py-2 text-left">프로세스</th>
                    <th className="px-4 py-2 text-left">담당</th>
                    <th className="px-4 py-2 text-left">시스템</th>
                    <th className="px-4 py-2 text-left">입력</th>
                    <th className="px-4 py-2 text-left">출력</th>
                  </tr>
                </thead>
                <tbody>
                  {(unitAnalysis.flowChartDetails || []).map((detail) => (
                    <tr
                      key={detail.id}
                      className="border-t border-green-100 dark:border-green-900/50"
                    >
                      <td className="px-4 py-2">{detail.stepNumber}</td>
                      <td className="px-4 py-2 font-medium">{detail.processName}</td>
                      <td className="px-4 py-2">{detail.responsible || "-"}</td>
                      <td className="px-4 py-2">{detail.systemUsed || "-"}</td>
                      <td className="px-4 py-2">{detail.inputData || "-"}</td>
                      <td className="px-4 py-2">{detail.outputData || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
