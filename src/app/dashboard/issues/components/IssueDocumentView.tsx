/**
 * @file src/app/dashboard/issues/components/IssueDocumentView.tsx
 * @description
 * 이슈 산출물 형식 보기 컴포넌트입니다.
 * 이슈를 문서 형태로 한 페이지씩 넘겨가며 볼 수 있습니다.
 * customer-requirements의 DocumentView와 컬럼명을 통일했습니다.
 *
 * 초보자 가이드:
 * 1. **문서 형태**: 이슈 명세서 스타일의 테이블 레이아웃
 * 2. **페이지 네비게이션**: 이전/다음 버튼으로 한 페이지씩 이동
 * 3. **키보드 지원**: 좌우 화살표로 페이지 이동 가능
 *
 * @example
 * <IssueDocumentView
 *   issues={issues}
 *   onEdit={handleEdit}
 *   projectName="프로젝트명"
 * />
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui";
import type { Issue } from "@/lib/api";

/** 우선순위 설정 */
const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CRITICAL: { label: "긴급", color: "text-error", bgColor: "bg-error/10" },
  HIGH: { label: "높음", color: "text-warning", bgColor: "bg-warning/10" },
  MEDIUM: { label: "보통", color: "text-primary", bgColor: "bg-primary/10" },
  LOW: { label: "낮음", color: "text-text-secondary", bgColor: "bg-surface" },
};

/** 상태 설정 */
const statusConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  OPEN: { label: "열림", icon: "radio_button_unchecked", color: "text-error", bgColor: "bg-error/10" },
  IN_PROGRESS: { label: "진행중", icon: "pending", color: "text-warning", bgColor: "bg-warning/10" },
  RESOLVED: { label: "해결됨", icon: "check_circle", color: "text-success", bgColor: "bg-success/10" },
  CLOSED: { label: "종료", icon: "done_all", color: "text-primary", bgColor: "bg-primary/10" },
  WONT_FIX: { label: "수정안함", icon: "block", color: "text-text-secondary", bgColor: "bg-slate-100 dark:bg-slate-800" },
};

/** 카테고리 설정 */
const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  BUG: { label: "버그", icon: "bug_report", color: "text-error" },
  IMPROVEMENT: { label: "개선", icon: "trending_up", color: "text-primary" },
  QUESTION: { label: "문의", icon: "help", color: "text-warning" },
  FEATURE: { label: "신규기능", icon: "add_circle", color: "text-success" },
  DOCUMENTATION: { label: "문서", icon: "description", color: "text-info" },
  OTHER: { label: "기타", icon: "more_horiz", color: "text-text-secondary" },
};

/** 유형 설정 (기능/비기능) */
const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  FUNCTIONAL: { label: "기능", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/10" },
  NON_FUNCTIONAL: { label: "비기능", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10" },
};

interface IssueDocumentViewProps {
  /** 표시할 이슈 목록 */
  issues: Issue[];
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (issue: Issue) => void;
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
 * 이슈 산출물 형식 보기 컴포넌트
 */
export function IssueDocumentView({
  issues,
  onEdit,
  projectName = "프로젝트",
}: IssueDocumentViewProps) {
  /** 현재 페이지 인덱스 (0부터 시작) */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 페이지 입력 필드 값 */
  const [pageInputValue, setPageInputValue] = useState("1");

  // 현재 표시할 이슈
  const currentIssue = issues[currentIndex];
  const totalPages = issues.length;

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

  // 이슈가 없는 경우
  if (totalPages === 0 || !currentIssue) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
        <Icon name="description" size="xl" className="text-text-secondary mb-4" />
        <p className="text-text-secondary">표시할 이슈가 없습니다.</p>
      </div>
    );
  }

  const status = statusConfig[currentIssue.status] || statusConfig.OPEN;
  const priority = priorityConfig[currentIssue.priority] || priorityConfig.MEDIUM;
  const category = categoryConfig[currentIssue.category] || categoryConfig.OTHER;
  const issueType = typeConfig[currentIssue.type] || typeConfig.FUNCTIONAL;

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
          onClick={() => onEdit(currentIssue)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
        >
          <Icon name="edit" size="xs" />
          <span>수정</span>
        </button>
      </div>

      {/* 문서 본문 (산출물 형식) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
        {/* 문서 헤더 */}
        <div className="bg-gradient-to-r from-error/5 to-warning/5 border-b border-slate-300 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="bug_report" className="text-error" />
              <h2 className="text-lg font-bold text-text dark:text-white">
                이슈 명세서
              </h2>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgColor}`}>
              <Icon name={status.icon} size="xs" className={status.color} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>
        </div>

        {/* 테이블 형식 내용 */}
        <div className="p-1">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {/* 유형 / 우선순위 (제일 상단) */}
              <tr>
                <th className="w-[140px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  유형
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-sm font-medium ${issueType.bgColor} ${issueType.color}`}>
                    {issueType.label}
                  </span>
                </td>
                <th className="w-[140px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  우선순위
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-sm font-medium ${priority.bgColor} ${priority.color}`}>
                      {priority.label}
                    </span>
                    {currentIssue.isDelayed && (
                      <span className="text-error font-medium text-xs">⚠ 지연</span>
                    )}
                  </div>
                </td>
              </tr>

              {/* 시스템명 / 업무영역명 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  시스템명
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {projectName}
                </td>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  업무영역명
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name={category.icon} size="xs" className={category.color} />
                    <span className={`font-medium ${category.color}`}>{category.label}</span>
                  </div>
                </td>
              </tr>

              {/* 요구사항 ID / 요구사항명 (이슈 ID / 이슈 제목) */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  요구사항 ID
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 font-mono text-primary">
                  {currentIssue.code || `ISS-${currentIssue.id.slice(0, 6)}`}
                </td>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  요구사항명
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 font-medium text-text dark:text-white">
                  {currentIssue.title}
                </td>
              </tr>

              {/* 요구사항 설명 (이슈 설명) */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white align-top">
                  요구사항 설명
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {currentIssue.title}
                </td>
              </tr>

              {/* 세부내용 및 요건 (상세 설명) */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white align-top">
                  세부내용 및<br />요건
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white min-h-[120px]">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {currentIssue.description || "-"}
                  </div>
                </td>
              </tr>

              {/* 보고자 / 담당자 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  보고자
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {currentIssue.reporter?.avatar ? (
                      <img
                        src={currentIssue.reporter.avatar}
                        alt={currentIssue.reporter.name || ""}
                        className="size-6 rounded-full"
                      />
                    ) : currentIssue.reporter?.name ? (
                      <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs text-primary font-medium">
                          {currentIssue.reporter.name[0]}
                        </span>
                      </div>
                    ) : null}
                    <span className="text-text dark:text-white">
                      {currentIssue.reporter?.name || "-"}
                    </span>
                  </div>
                </td>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  담당자
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {currentIssue.assignee?.avatar ? (
                      <img
                        src={currentIssue.assignee.avatar}
                        alt={currentIssue.assignee.name || ""}
                        className="size-6 rounded-full"
                      />
                    ) : currentIssue.assignee?.name ? (
                      <div className="size-6 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="text-xs text-success font-medium">
                          {currentIssue.assignee.name[0]}
                        </span>
                      </div>
                    ) : null}
                    <span className="text-text dark:text-white">
                      {currentIssue.assignee?.name || "-"}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 보고일 / 목표일 (분리된 컬럼) */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  보고일
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white">
                  {formatDate(currentIssue.reportDate || currentIssue.createdAt)}
                </td>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  목표일
                </th>
                <td className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <span className={`font-medium ${currentIssue.isDelayed ? "text-error" : "text-text dark:text-white"}`}>
                    {formatDate(currentIssue.dueDate) || "-"}
                    {currentIssue.isDelayed && " (지연)"}
                  </span>
                </td>
              </tr>

              {/* 진행상태 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white">
                  진행상태
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded w-fit ${status.bgColor}`}>
                    <Icon name={status.icon} size="xs" className={status.color} />
                    <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                  </span>
                </td>
              </tr>

              {/* 처리내용 */}
              <tr>
                <th className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-text dark:text-white align-top">
                  처리내용
                </th>
                <td colSpan={3} className="border border-slate-300 dark:border-slate-600 px-4 py-3 text-text dark:text-white min-h-[80px]">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {currentIssue.resolution || "-"}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 문서 푸터 */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-300 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              등록일: {formatDate(currentIssue.createdAt)}
            </span>
            <span>
              최종 수정일: {formatDate(currentIssue.updatedAt)}
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
