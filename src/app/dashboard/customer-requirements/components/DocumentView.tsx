/**
 * @file src/app/dashboard/customer-requirements/components/DocumentView.tsx
 * @description
 * 고객요구사항 산출물 형식 보기 컴포넌트입니다.
 * 요구사항을 문서 형태로 한 페이지씩 넘겨가며 볼 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **문서 형태**: 요구사항 명세서 스타일의 테이블 레이아웃
 * 2. **페이지 네비게이션**: 이전/다음 버튼으로 한 페이지씩 이동
 * 3. **키보드 지원**: 좌우 화살표로 페이지 이동 가능
 *
 * @example
 * <DocumentView
 *   requirements={requirements}
 *   onEdit={handleEdit}
 *   projectName="프로젝트명"
 * />
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui";
import {
  type CustomerRequirement,
  APPLY_STATUS_CONFIG,
} from "../types";

interface DocumentViewProps {
  /** 표시할 요구사항 목록 */
  requirements: CustomerRequirement[];
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (requirement: CustomerRequirement) => void;
  /** 프로젝트명 (문서 헤더에 표시) */
  projectName?: string;
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD 형태)
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 고객요구사항 산출물 형식 보기 컴포넌트
 */
export function DocumentView({
  requirements,
  onEdit,
  projectName = "프로젝트",
}: DocumentViewProps) {
  /** 현재 페이지 인덱스 (0부터 시작) */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 페이지 입력 필드 값 */
  const [pageInputValue, setPageInputValue] = useState("1");

  // 현재 표시할 요구사항
  const currentRequirement = requirements[currentIndex];
  const totalPages = requirements.length;

  // 페이지 변경 시 입력 필드 동기화
  useEffect(() => {
    setPageInputValue(String(currentIndex + 1));
  }, [currentIndex]);

  /**
   * 이전 페이지로 이동
   */
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * 다음 페이지로 이동
   */
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  /**
   * 첫 페이지로 이동
   */
  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  /**
   * 마지막 페이지로 이동
   */
  const goToLast = useCallback(() => {
    setCurrentIndex(totalPages - 1);
  }, [totalPages]);

  /**
   * 특정 페이지로 이동
   */
  const goToPage = useCallback((page: number) => {
    const targetIndex = Math.max(0, Math.min(totalPages - 1, page - 1));
    setCurrentIndex(targetIndex);
  }, [totalPages]);

  /**
   * 키보드 네비게이션 지원
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "Home") {
        goToFirst();
      } else if (e.key === "End") {
        goToLast();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext, goToFirst, goToLast]);

  /**
   * 페이지 입력 핸들러
   */
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  /**
   * 페이지 입력 확정 핸들러
   */
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
    } else {
      // 유효하지 않은 입력이면 현재 페이지로 복원
      setPageInputValue(String(currentIndex + 1));
    }
  };

  // 요구사항이 없는 경우
  if (totalPages === 0 || !currentRequirement) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
        <Icon name="description" size="xl" className="text-text-secondary mb-4" />
        <p className="text-text-secondary">표시할 요구사항이 없습니다.</p>
      </div>
    );
  }

  const statusConfig = APPLY_STATUS_CONFIG[currentRequirement.applyStatus] || APPLY_STATUS_CONFIG.REVIEWING;

  return (
    <div className="space-y-4">
      {/* 네비게이션 바 */}
      <div className="flex items-center justify-between bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3">
        {/* 좌측: 페이지 정보 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            총 <span className="font-bold text-primary">{totalPages}</span>건
          </span>
          <div className="h-4 w-px bg-border dark:bg-border-dark" />
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              className="w-12 px-2 py-1 text-center text-sm font-medium rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-text-secondary">
              / {totalPages} 페이지
            </span>
          </form>
        </div>

        {/* 중앙: 네비게이션 버튼 */}
        <div className="flex items-center gap-1">
          {/* 처음으로 */}
          <button
            onClick={goToFirst}
            disabled={currentIndex === 0}
            className="size-9 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="처음 (Home)"
          >
            <Icon name="first_page" size="sm" />
          </button>
          {/* 이전 */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="size-9 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="이전 (←)"
          >
            <Icon name="chevron_left" size="sm" />
          </button>
          {/* 다음 */}
          <button
            onClick={goToNext}
            disabled={currentIndex === totalPages - 1}
            className="size-9 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="다음 (→)"
          >
            <Icon name="chevron_right" size="sm" />
          </button>
          {/* 마지막으로 */}
          <button
            onClick={goToLast}
            disabled={currentIndex === totalPages - 1}
            className="size-9 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="마지막 (End)"
          >
            <Icon name="last_page" size="sm" />
          </button>
        </div>

        {/* 우측: 수정 버튼 */}
        <button
          onClick={() => onEdit(currentRequirement)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
        >
          <Icon name="edit" size="xs" />
          <span>수정</span>
        </button>
      </div>

      {/* 문서 본문 (산출물 형식) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
        {/* 문서 헤더 */}
        <div className="bg-gradient-to-r from-primary/5 to-cyan-500/5 border-b border-slate-300 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="description" className="text-primary" />
              <h2 className="text-lg font-bold text-text dark:text-white">
                요구사항 명세서
              </h2>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bgColor}`}>
              <Icon name={statusConfig.icon} size="xs" className={statusConfig.color} />
              <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
          </div>
        </div>

        {/* 테이블 형식 내용 */}
        <div className="p-1">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {/* 시스템명 / 업무영역명 */}
              <tr>
                <th className="w-[140px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  시스템명
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {projectName}
                </td>
                <th className="w-[140px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  업무영역명
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentRequirement.category || currentRequirement.businessUnit || "-"}
                </td>
              </tr>

              {/* 요구사항 ID / 요구사항명 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  요구사항 ID
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 font-mono text-primary">
                  {currentRequirement.code || "-"}
                </td>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  요구사항명
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 font-medium text-text dark:text-white">
                  {currentRequirement.functionName || "-"}
                </td>
              </tr>

              {/* 요구사항 설명 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white align-top">
                  요구사항 설명
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentRequirement.content || "-"}
                </td>
              </tr>

              {/* 세부내용 및 요건 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white align-top">
                  세부내용 및<br />요건
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white min-h-[120px]">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {currentRequirement.solution || "-"}
                  </div>
                </td>
              </tr>

              {/* 제약사항 및 전제조건 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white align-top">
                  제약사항 및<br />전제조건
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentRequirement.remarks || "-"}
                </td>
              </tr>

              {/* 유형 / 업무 담당자 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  유형
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentRequirement.category || "기능"}
                </td>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  업무 담당자
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentRequirement.requester || "-"}
                </td>
              </tr>

              {/* 출처 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  출처
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentRequirement.businessUnit || "-"} 사업부 요청 ({formatDate(currentRequirement.requestDate)})
                </td>
              </tr>

              {/* 기타사항 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  기타사항
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text-secondary">
                  {currentRequirement.toBeCode ? `TO-BE 코드: ${currentRequirement.toBeCode}` : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 문서 푸터 */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-300 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              등록일: {formatDate(currentRequirement.createdAt)}
            </span>
            <span>
              최종 수정일: {formatDate(currentRequirement.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 힌트 */}
      <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">←</kbd>
          <span>이전</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">→</kbd>
          <span>다음</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">Home</kbd>
          <span>처음</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">End</kbd>
          <span>마지막</span>
        </span>
      </div>
    </div>
  );
}
