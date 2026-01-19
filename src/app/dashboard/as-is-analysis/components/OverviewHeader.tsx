/**
 * @file src/app/dashboard/as-is-analysis/components/OverviewHeader.tsx
 * @description
 * AS-IS 분석 페이지의 헤더 컴포넌트입니다.
 * 프로젝트 정보, 사업부 선택, 새로고침 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **프로젝트 배지**: 현재 선택된 프로젝트 표시
 * 2. **사업부 선택**: 드롭다운으로 사업부 전환
 * 3. **새로고침**: 데이터 새로고침 버튼
 */

"use client";

import { Icon, Button } from "@/components/ui";
import { BUSINESS_UNITS, type BusinessUnit } from "@/constants/business-units";
import type { AsIsOverview } from "../types";

interface OverviewHeaderProps {
  /** 프로젝트 이름 */
  projectName: string;
  /** AS-IS 총괄 데이터 */
  overview?: AsIsOverview | null;
  /** 현재 선택된 사업부 */
  businessUnit: BusinessUnit;
  /** 사업부 변경 핸들러 */
  onBusinessUnitChange: (unit: BusinessUnit) => void;
  /** 새로고침 핸들러 */
  onRefresh: () => void;
  /** 작성가이드 모달 열기 핸들러 */
  onShowGuide: () => void;
}

/**
 * AS-IS 분석 헤더 컴포넌트
 */
export function OverviewHeader({
  projectName,
  overview,
  businessUnit,
  onBusinessUnitChange,
  onRefresh,
  onShowGuide,
}: OverviewHeaderProps) {

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* 왼쪽: 제목 및 설명 */}
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

      {/* 오른쪽: 프로젝트 및 메타 정보 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 사업부 선택 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Icon name="business" size="sm" className="text-amber-500" />
          <select
            value={businessUnit}
            onChange={(e) => onBusinessUnitChange(e.target.value as BusinessUnit)}
            className="bg-transparent text-sm font-medium text-amber-500 cursor-pointer focus:outline-none"
          >
            {BUSINESS_UNITS.map((unit) => (
              <option key={unit} value={unit} className="text-text dark:text-white bg-surface dark:bg-surface-dark">
                {unit}
              </option>
            ))}
          </select>
        </div>

        {/* 프로젝트 배지 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
          <Icon name="folder" size="sm" className="text-primary" />
          <span className="text-sm font-medium text-primary">
            {projectName}
          </span>
        </div>

        {/* 작성가이드 버튼 */}
        <Button
          variant="outline"
          size="sm"
          leftIcon="menu_book"
          onClick={onShowGuide}
        >
          작성가이드
        </Button>

        {/* 새로고침 버튼 */}
        <Button
          variant="outline"
          size="sm"
          leftIcon="refresh"
          onClick={onRefresh}
        >
          새로고침
        </Button>
      </div>
    </div>
  );
}
