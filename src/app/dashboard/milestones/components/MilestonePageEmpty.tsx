/**
 * @file src/app/dashboard/milestones/components/MilestonePageEmpty.tsx
 * @description
 * 프로젝트가 없거나 선택되지 않았을 때 표시되는 빈 상태 컴포넌트입니다.
 * 안내 메시지와 프로젝트 생성 링크를 표시합니다.
 *
 * 초보자 가이드:
 * 1. **표시 조건**: selectedProjectId가 null 또는 undefined일 때
 * 2. **메시지**: "프로젝트를 선택해주세요"
 * 3. **링크**: 대시보드로 돌아가기 (필요시 프로젝트 생성 페이지)
 *
 * 수정 방법:
 * - 메시지 텍스트: 아래 내용 변경
 * - 아이콘: Icon name 변경
 * - 링크 대상: href 변경
 */

"use client";

import Link from "next/link";
import { Icon } from "@/components/ui";

/**
 * 마일스톤 페이지 빈 상태 컴포넌트
 */
export function MilestonePageEmpty() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-8 max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <Icon
            name="inventory_2"
            size="lg"
            className="text-slate-400 dark:text-slate-500"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            프로젝트를 선택해주세요
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            마일스톤을 보려면 먼저 프로젝트를 선택해야 합니다.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
        >
          <Icon name="arrow_back" size="sm" />
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
