/**
 * @file src/app/dashboard/as-is-analysis/components/UnitAnalysisPanel.tsx
 * @description
 * 단위업무 상세 분석 패널 컴포넌트입니다.
 * 프로세스 정의서, 프로세스 맵, R&R, 인터뷰, 이슈 등을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **대상 업무 정보**: 총괄에서 선택한 업무 정보 표시
 * 2. **업무 프로세스 정의서**: 테이블 형태로 프로세스 단계 정의
 * 3. **업무 프로세스 맵**: Flow Chart / Swimlane 탭 전환
 * 4. **R&R 정의**: 역할과 책임 정의 테이블
 * 5. **현업 인터뷰 결과**: 카드형 인터뷰 내용
 * 6. **이슈/Pain Point**: 이슈 목록 테이블
 * 7. **조건부 영역**: 현행방식에 따라 추가 섹션 표시
 */

"use client";

import { useState, useEffect } from "react";
import { Icon, Button } from "@/components/ui";
import { useAsIsUnitAnalysis } from "../hooks/useAsIsUnitAnalysis";
import { MAJOR_CATEGORIES, CURRENT_METHODS, SECTION_STYLES, shouldShowSectionA, shouldShowSectionB } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { ProcessDefinitionTable } from "./ProcessDefinitionTable";
import { ProcessMapSection } from "./ProcessMapSection";
import { ResponsibilityTable } from "./ResponsibilityTable";
import { InterviewCards } from "./InterviewCards";
import { IssueTable } from "./IssueTable";
// 조건부 섹션 A (수기/엑셀용)
import { DocumentTable } from "./DocumentTable";
import { DocumentAnalysisTable } from "./DocumentAnalysisTable";
// 조건부 섹션 B (시스템용)
import { FunctionTable } from "./FunctionTable";
import { ScreenTable } from "./ScreenTable";
import { InterfaceTable } from "./InterfaceTable";
import { DataModelTable } from "./DataModelTable";
import { CodeDefinitionTable } from "./CodeDefinitionTable";
import type { AsIsOverviewItem } from "../types";

interface UnitAnalysisPanelProps {
  /** 선택된 업무 항목 */
  item: AsIsOverviewItem | null;
  /** 돌아가기 핸들러 */
  onBack: () => void;
}

/**
 * 단위업무 상세 분석 패널 컴포넌트
 */
export function UnitAnalysisPanel({ item, onBack }: UnitAnalysisPanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 단위업무 분석 데이터 조회
  const {
    unitAnalysis,
    isLoading,
    error,
    create,
    isCreating,
    saveFlowChart,
    saveSwimlane,
    isSaving,
  } = useAsIsUnitAnalysis(item?.id);

  // 항목이 없으면 안내 표시
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Icon name="touch_app" size="xl" className="text-text-secondary mb-4" />
        <p className="text-text-secondary text-lg font-medium">
          업무를 선택해주세요
        </p>
        <p className="text-text-secondary text-sm mt-1">
          좌측 목록에서 분석할 업무를 선택하세요
        </p>
      </div>
    );
  }

  const majorConfig = MAJOR_CATEGORIES[item.majorCategory];
  const methodConfig = CURRENT_METHODS[item.currentMethod];
  const showSectionA = shouldShowSectionA(item.currentMethod);
  const showSectionB = shouldShowSectionB(item.currentMethod);

  // 단위업무 분석이 없으면 생성 안내
  if (!isLoading && !error && !unitAnalysis) {
    return (
      <div className="p-6">
        {/* 상단 네비게이션 */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-text-secondary hover:text-text dark:hover:text-white transition-colors"
          >
            <Icon name="arrow_back" size="sm" />
            <span className="text-sm">총괄로 돌아가기</span>
          </button>
        </div>

        {/* 대상 업무 정보 */}
        <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark mb-6">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg ${majorConfig.bgColor}`}>
              <Icon name={majorConfig.icon} size="sm" className={majorConfig.color} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">{majorConfig.label}</span>
                <Icon name="chevron_right" size="xs" className="text-text-secondary" />
                <span className="text-xs text-text-secondary">{item.middleCategory}</span>
              </div>
              <h3 className="text-lg font-bold text-text dark:text-white mt-0.5">
                {item.taskName}
              </h3>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${methodConfig.bgColor}`}>
                <Icon name={methodConfig.icon} size="xs" className={methodConfig.color} />
                <span className={`text-xs font-medium ${methodConfig.color}`}>
                  {methodConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 생성 안내 */}
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Icon name="schema" size="lg" className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-text dark:text-white mb-2">
            단위업무 분석 시작하기
          </h2>
          <p className="text-text-secondary text-center max-w-md mb-4">
            이 업무의 상세 분석 데이터가 없습니다.
            <br />
            프로세스 정의서, Flow Chart, R&R 등을 작성하려면 분석을 시작하세요.
          </p>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => create({ overviewItemId: item.id })}
            isLoading={isCreating}
          >
            분석 시작
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-text-secondary hover:text-text dark:hover:text-white transition-colors"
        >
          <Icon name="arrow_back" size="sm" />
          <span className="text-sm">총괄로 돌아가기</span>
        </button>
      </div>

      {/* 대상 업무 정보 */}
      <div className="p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <SectionHeader
          style={SECTION_STYLES.basicInfo}
          title="대상 업무 정보"
        />
        <div className="flex items-center gap-3 mt-3">
          <div className={`px-3 py-1.5 rounded-lg ${majorConfig.bgColor}`}>
            <Icon name={majorConfig.icon} size="sm" className={majorConfig.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">{majorConfig.label}</span>
              <Icon name="chevron_right" size="xs" className="text-text-secondary" />
              <span className="text-xs text-text-secondary">{item.middleCategory}</span>
            </div>
            <h3 className="text-lg font-bold text-text dark:text-white mt-0.5">
              {item.taskName}
            </h3>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${methodConfig.bgColor}`}>
              <Icon name={methodConfig.icon} size="xs" className={methodConfig.color} />
              <span className={`text-xs font-medium ${methodConfig.color}`}>
                {methodConfig.label}
              </span>
            </div>
          </div>
        </div>
        {item.issueSummary && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-dashed border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <Icon name="warning" size="xs" className="text-red-500 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{item.issueSummary}</p>
            </div>
          </div>
        )}
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Icon name="progress_activity" size="lg" className="text-primary animate-spin" />
        </div>
      )}

      {/* 분석 콘텐츠 */}
      {unitAnalysis && (
        <>
          {/* 업무 프로세스 정의서 */}
          <ProcessDefinitionTable unitAnalysis={unitAnalysis} />

          {/* 업무 프로세스 맵 */}
          <ProcessMapSection
            unitAnalysis={unitAnalysis}
            onSaveFlowChart={saveFlowChart}
            onSaveSwimlane={saveSwimlane}
          />

          {/* R&R 정의 */}
          <ResponsibilityTable unitAnalysis={unitAnalysis} />

          {/* 현업 인터뷰 결과 */}
          <InterviewCards unitAnalysis={unitAnalysis} />

          {/* 이슈/Pain Point */}
          <IssueTable unitAnalysis={unitAnalysis} />

          {/* 조건부 섹션 A: 수기/엑셀용 */}
          {showSectionA && (
            <div className="space-y-6">
              {/* 섹션 A 헤더 */}
              <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
                <div className="flex items-center gap-2">
                  <Icon name="folder" size="sm" className="text-teal-600" />
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                    문서/수기 관리 섹션
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    조건부
                  </span>
                </div>
              </div>

              {/* 문서 목록 */}
              <DocumentTable unitAnalysis={unitAnalysis} />

              {/* 문서 구조 분석 */}
              <DocumentAnalysisTable unitAnalysis={unitAnalysis} />
            </div>
          )}

          {/* 조건부 섹션 B: 시스템용 */}
          {showSectionB && (
            <div className="space-y-6">
              {/* 섹션 B 헤더 */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <Icon name="computer" size="sm" className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    시스템 분석 섹션
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    조건부
                  </span>
                </div>
              </div>

              {/* 기능 목록 */}
              <FunctionTable unitAnalysis={unitAnalysis} />

              {/* 화면 목록 */}
              <ScreenTable unitAnalysis={unitAnalysis} />

              {/* 인터페이스 목록 */}
              <InterfaceTable unitAnalysis={unitAnalysis} />

              {/* 데이터 모델 */}
              <DataModelTable unitAnalysis={unitAnalysis} />

              {/* 코드 정의서 */}
              <CodeDefinitionTable unitAnalysis={unitAnalysis} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
