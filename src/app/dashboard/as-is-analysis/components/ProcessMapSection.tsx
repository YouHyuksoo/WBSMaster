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

import { useState, useMemo } from "react";
import { Icon } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { FlowChartCanvas } from "./FlowChartCanvas";
import { SwimlaneCanvas } from "./SwimlaneCanvas";
import type { AsIsUnitAnalysis, FlowChartData, SwimlaneData, ProcessNodeData } from "../types";

interface ProcessMapSectionProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
  /** Flow Chart 저장 핸들러 */
  onSaveFlowChart?: (data: FlowChartData) => void;
  /** Swimlane 저장 핸들러 */
  onSaveSwimlane?: (data: SwimlaneData) => void;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
  /** Flow Chart 저장 중 상태 */
  isSavingFlowChart?: boolean;
  /** Swimlane 저장 중 상태 */
  isSavingSwimlane?: boolean;
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
  isSavingFlowChart = false,
  isSavingSwimlane = false,
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

  /**
   * Flow Chart 노드에서 프로세스 노드만 추출하여 테이블 데이터 생성
   * - process, subProcess 타입 노드만 필터링
   * - 위치(y좌표) 기준으로 정렬하여 순서 부여
   */
  const processNodes = useMemo(() => {
    const nodes = unitAnalysis.flowChartData?.nodes || [];

    // 프로세스 관련 노드 타입만 필터링
    const processTypeNodes = nodes.filter(
      (node) => node.type === "process" || node.type === "subProcess"
    );

    // y좌표 기준 정렬 (위에서 아래로)
    const sortedNodes = [...processTypeNodes].sort(
      (a, b) => (a.position?.y || 0) - (b.position?.y || 0)
    );

    // 테이블 데이터로 변환
    return sortedNodes.map((node, index) => {
      const data = node.data as ProcessNodeData;
      return {
        id: node.id,
        stepNumber: index + 1,
        processName: data?.label || "프로세스",
        description: data?.description || "",
        responsible: data?.responsible || "",
        systemUsed: data?.systemUsed || "",
        inputData: data?.inputData || "",
        outputData: data?.outputData || "",
      };
    });
  }, [unitAnalysis.flowChartData?.nodes]);

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
              isSaving={isSavingFlowChart}
            />
          ) : (
            <SwimlaneCanvas
              initialData={unitAnalysis.swimlaneData}
              onSave={onSaveSwimlane}
              readOnly={readOnly}
              isSaving={isSavingSwimlane}
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
              (노드를 더블클릭하여 상세 정보를 입력하세요)
            </span>
          </div>
          {/* 안내 박스 */}
          <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Icon name="info" size="xs" className="text-blue-500 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">💡 프로세스 상세 정보 등록 방법:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                  <li><strong>프로세스 노드</strong>를 <strong>더블클릭</strong>하여 편집 모드로 진입</li>
                  <li>프로세스명, <strong>설명</strong>, 담당자, <strong className="text-green-600 dark:text-green-400">입력 데이터</strong>, <strong className="text-orange-600 dark:text-orange-400">출력 데이터</strong> 입력</li>
                  <li>노드 내 <strong>저장</strong> 버튼 → 상단 <strong>저장</strong> 버튼 클릭 시 <strong className="text-primary">아래 테이블에 자동 반영</strong></li>
                </ol>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-green-200 dark:border-green-800 overflow-hidden">
            {processNodes.length === 0 ? (
              <div className="p-6 text-center">
                <Icon name="touch_app" size="lg" className="text-text-secondary mb-2 mx-auto" />
                <p className="text-sm text-text-secondary mb-1">
                  등록된 프로세스 노드가 없습니다
                </p>
                <p className="text-xs text-text-secondary">
                  다이어그램에 프로세스 노드를 추가하고 더블클릭하여 상세 정보를 입력하세요
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50 dark:bg-green-900/20 text-xs font-semibold text-text-secondary uppercase">
                    <th className="px-3 py-2 text-left w-14">순번</th>
                    <th className="px-3 py-2 text-left">프로세스</th>
                    <th className="px-3 py-2 text-left">설명</th>
                    <th className="px-3 py-2 text-left w-20">담당</th>
                    <th className="px-3 py-2 text-left">입력</th>
                    <th className="px-3 py-2 text-left">출력</th>
                  </tr>
                </thead>
                <tbody>
                  {processNodes.map((node) => (
                    <tr
                      key={node.id}
                      className="border-t border-green-100 dark:border-green-900/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors"
                    >
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center justify-center size-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                          {node.stepNumber}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-text dark:text-white">
                        {node.processName}
                      </td>
                      <td className="px-3 py-2 text-text-secondary text-xs">
                        {node.description || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {node.responsible ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Icon name="person" size="xs" className="text-text-secondary" />
                            {node.responsible}
                          </span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {node.inputData ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                            <Icon name="arrow_forward" size="xs" />
                            {node.inputData}
                          </span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {node.outputData ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs">
                            {node.outputData}
                            <Icon name="arrow_forward" size="xs" />
                          </span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
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
