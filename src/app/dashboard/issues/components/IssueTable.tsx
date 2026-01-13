/**
 * @file src/app/dashboard/issues/components/IssueTable.tsx
 * @description
 * 이슈 테이블 컴포넌트입니다.
 * 이슈 목록을 테이블 형태로 표시하고 수정/상태변경 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 수정, 진행상태, 코드, 이슈, 우선순위, 카테고리, 보고자, 담당자, 보고일, 목표일
 * 2. **상태 배지**: 클릭 시 드롭다운으로 상태 변경 가능
 */

"use client";

import { useState } from "react";
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
const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  OPEN: { label: "열림", icon: "radio_button_unchecked", color: "text-error" },
  IN_PROGRESS: { label: "진행중", icon: "pending", color: "text-warning" },
  RESOLVED: { label: "해결됨", icon: "check_circle", color: "text-success" },
  CLOSED: { label: "종료", icon: "done_all", color: "text-primary" },
  WONT_FIX: { label: "수정안함", icon: "block", color: "text-text-secondary" },
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

interface IssueTableProps {
  /** 표시할 이슈 목록 */
  issues: Issue[];
  /** 전체 이슈 수 (빈 목록 메시지용) */
  totalCount: number;
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (issue: Issue) => void;
  /** 상태 변경 핸들러 */
  onStatusChange: (id: string, newStatus: string) => void;
}

/**
 * 날짜 포맷팅 (월/일 형태)
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 이슈 테이블 컴포넌트
 */
export function IssueTable({
  issues,
  totalCount,
  onEdit,
  onStatusChange,
}: IssueTableProps) {
  /** 상태 드롭다운이 열린 이슈 ID */
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);

  /**
   * 상태 변경 처리
   */
  const handleStatusChange = (id: string, newStatus: string) => {
    onStatusChange(id, newStatus);
    setOpenStatusDropdown(null);
  };

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 (수정 버튼을 맨 앞에 배치) */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1400px]"
        style={{ gridTemplateColumns: "50px 80px 80px 1fr 80px 80px 60px 100px 100px 80px 90px 150px" }}
      >
        <div>수정</div>
        <div>진행상태</div>
        <div>코드</div>
        <div>이슈</div>
        <div>우선순위</div>
        <div>카테고리</div>
        <div>유형</div>
        <div>보고자</div>
        <div>담당자</div>
        <div>보고일</div>
        <div>목표일</div>
        <div>처리내용</div>
      </div>

      {/* 빈 목록 */}
      {issues.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">
            {totalCount === 0
              ? "등록된 이슈가 없습니다."
              : "검색 조건에 맞는 이슈가 없습니다."}
          </p>
        </div>
      )}

      {/* 이슈 목록 */}
      {issues.map((issue) => {
        const priority = priorityConfig[issue.priority] || priorityConfig.MEDIUM;
        const status = statusConfig[issue.status] || statusConfig.OPEN;
        const category = categoryConfig[issue.category] || categoryConfig.OTHER;
        const issueType = typeConfig[issue.type] || typeConfig.FUNCTIONAL;

        return (
          <div
            key={issue.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1400px]"
            style={{ gridTemplateColumns: "50px 80px 80px 1fr 80px 80px 60px 100px 100px 80px 90px 150px" }}
          >
            {/* 수정 버튼 (맨 앞 배치) */}
            <div>
              <button
                onClick={() => onEdit(issue)}
                className="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                title="수정"
              >
                <Icon name="edit" size="xs" />
              </button>
            </div>

            {/* 상태 배지 (클릭 시 드롭다운) */}
            <div className="relative">
              <button
                onClick={() => setOpenStatusDropdown(openStatusDropdown === issue.id ? null : issue.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  issue.status === "CLOSED"
                    ? "bg-primary/10 text-primary"
                    : issue.status === "RESOLVED"
                    ? "bg-success/10 text-success"
                    : issue.status === "IN_PROGRESS"
                    ? "bg-warning/10 text-warning"
                    : issue.status === "WONT_FIX"
                    ? "bg-slate-100 dark:bg-slate-800 text-text-secondary"
                    : "bg-error/10 text-error"
                }`}
                title="클릭하여 상태 변경"
              >
                <Icon name={status.icon} size="xs" />
                <span className="hidden sm:inline">{status.label}</span>
              </button>

              {/* 상태 변경 드롭다운 */}
              {openStatusDropdown === issue.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenStatusDropdown(null)}
                  />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(issue.id, key)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                          issue.status === key ? "bg-primary/5" : ""
                        }`}
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                        {issue.status === key && (
                          <Icon name="check" size="xs" className="ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 코드 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {issue.code || `ISS-${issue.id.slice(0, 6)}`}
              </span>
            </div>

            {/* 제목 + 설명 */}
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${
                issue.status === "CLOSED" || issue.status === "WONT_FIX"
                  ? "text-text-secondary line-through"
                  : "text-text dark:text-white"
              }`}>
                {issue.title}
              </p>
              {issue.description && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                  {issue.description}
                </p>
              )}
            </div>

            {/* 우선순위 */}
            <div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${priority.bgColor} ${priority.color}`}>
                {priority.label}
              </span>
            </div>

            {/* 카테고리 */}
            <div>
              <div className="flex items-center gap-1">
                <Icon name={category.icon} size="xs" className={category.color} />
                <span className={`text-xs font-medium ${category.color}`}>
                  {category.label}
                </span>
              </div>
            </div>

            {/* 유형 (기능/비기능) */}
            <div>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${issueType.bgColor} ${issueType.color}`}>
                {issueType.label}
              </span>
            </div>

            {/* 보고자 */}
            <div>
              <div className="flex items-center gap-1">
                {issue.reporter?.avatar ? (
                  <img
                    src={issue.reporter.avatar}
                    alt={issue.reporter.name || ""}
                    className="size-5 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-primary font-medium">
                      {issue.reporter?.name?.[0] || "?"}
                    </span>
                  </div>
                )}
                <span className="text-xs text-text dark:text-white truncate">
                  {issue.reporter?.name || "-"}
                </span>
              </div>
            </div>

            {/* 담당자 */}
            <div>
              <div className="flex items-center gap-1">
                {issue.assignee?.avatar ? (
                  <img
                    src={issue.assignee.avatar}
                    alt={issue.assignee.name || ""}
                    className="size-5 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-success font-medium">
                      {issue.assignee?.name?.[0] || "?"}
                    </span>
                  </div>
                )}
                <span className="text-xs text-text dark:text-white truncate">
                  {issue.assignee?.name || "-"}
                </span>
              </div>
            </div>

            {/* 보고일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(issue.reportDate)}
              </span>
            </div>

            {/* 목표일 */}
            <div>
              <span className={`text-xs ${issue.isDelayed ? "text-error font-medium" : "text-text-secondary"}`}>
                {formatDate(issue.dueDate)}
                {issue.isDelayed && " (지연)"}
              </span>
            </div>

            {/* 처리내용 */}
            <div className="min-w-0">
              <p className="text-xs text-text dark:text-white line-clamp-2" title={issue.resolution || ""}>
                {issue.resolution || "-"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
