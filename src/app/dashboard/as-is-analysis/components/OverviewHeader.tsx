/**
 * @file src/app/dashboard/as-is-analysis/components/OverviewHeader.tsx
 * @description
 * AS-IS 분석 페이지의 헤더 컴포넌트입니다.
 * 작성가이드, 새로고침 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **프로젝트**: 상단 내비게이션에만 표시한다 (화면 안에 프로젝트 배지를 두지 않는다)
 * 2. **작성가이드**: 작성가이드 모달 열기 버튼
 * 3. **새로고침**: 데이터 새로고침 버튼
 * (사업부 구분은 화면에서 쓰지 않는다. 데이터는 POLE 로 고정 저장된다.)
 */

"use client";

import { Icon, Button } from "@/components/ui";

interface OverviewHeaderProps {
  /** 새로고침 핸들러 */
  onRefresh: () => void;
  /** 작성가이드 모달 열기 핸들러 */
  onShowGuide: () => void;
}

/**
 * AS-IS 분석 헤더 컴포넌트
 */
export function OverviewHeader({
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

      {/* 오른쪽: 버튼 */}
      <div className="flex flex-wrap items-center gap-3">
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
