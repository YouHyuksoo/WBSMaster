/**
 * @file src/app/dashboard/milestones/components/MilestonePageContent.tsx
 * @description
 * 마일스톤 페이지의 메인 콘텐츠 영역입니다.
 * MilestoneTimeline 컴포넌트를 래핑하고 로딩/에러 상태를 처리합니다.
 *
 * 초보자 가이드:
 * 1. **children**: MilestoneTimeline 컴포넌트가 전달됨
 * 2. **레이아웃**: 전체 너비 사용, 스크롤 가능
 * 3. **스타일**: 대시보드와 유사한 카드 스타일
 *
 * 수정 방법:
 * - 배경색: bg-white/dark:bg-slate-900 변경
 * - 높이 제약: h-96 같은 클래스 추가
 * - 스크롤: overflow-y-auto 추가
 */

"use client";

import { ReactNode } from "react";

interface MilestonePageContentProps {
  /** MilestoneTimeline 컴포넌트 */
  children: ReactNode;
}

/**
 * 마일스톤 페이지 메인 콘텐츠 컴포넌트
 */
export function MilestonePageContent({ children }: MilestonePageContentProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {children}
    </div>
  );
}
