/**
 * @file src/app/dashboard/requirements/components/RequirementTable.tsx
 * @description
 * 업무협조 테이블 컴포넌트입니다.
 * 업무협조 목록을 테이블 형태로 표시하고 수정/삭제/상태변경 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 관리, 진행상태, 코드, 업무협조, 우선순위, 카테고리, 문서, 요청자, 담당자, 요청일, 마감일, 연결 태스크
 * 2. **상태 배지**: 클릭 시 드롭다운으로 상태 변경 가능
 * 3. **문서 링크**: OneDrive 링크 클릭 시 미리보기 모달
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import type { Requirement } from "@/lib/api";

/** 우선순위 설정 */
const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  MUST: { label: "필수", color: "text-error", bgColor: "bg-error/10" },
  SHOULD: { label: "중요", color: "text-warning", bgColor: "bg-warning/10" },
  COULD: { label: "선택", color: "text-primary", bgColor: "bg-primary/10" },
  WONT: { label: "보류", color: "text-text-secondary", bgColor: "bg-surface" },
};

/** 상태 설정 */
const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  DRAFT: { label: "초안", icon: "edit_note", color: "text-text-secondary" },
  APPROVED: { label: "승인", icon: "check_circle", color: "text-success" },
  REJECTED: { label: "반려", icon: "cancel", color: "text-error" },
  IMPLEMENTED: { label: "구현완료", icon: "done_all", color: "text-primary" },
};

interface RequirementTableProps {
  /** 표시할 요구사항 목록 */
  requirements: Requirement[];
  /** 전체 요구사항 수 (빈 목록 메시지용) */
  totalCount: number;
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (requirement: Requirement) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: (id: string, title: string) => void;
  /** 상태 변경 핸들러 */
  onStatusChange: (id: string, newStatus: string) => void;
  /** 문서 미리보기 핸들러 */
  onPreviewDocument: (url: string) => void;
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
 * 업무협조 테이블 컴포넌트
 */
export function RequirementTable({
  requirements,
  totalCount,
  onEdit,
  onDelete,
  onStatusChange,
  onPreviewDocument,
}: RequirementTableProps) {
  /** 상태 드롭다운이 열린 요구사항 ID */
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  /** 드롭다운이 위로 열려야 하는지 여부 */
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);

  /**
   * 상태 변경 처리
   */
  const handleStatusChange = (id: string, newStatus: string) => {
    onStatusChange(id, newStatus);
    setOpenStatusDropdown(null);
  };

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 (관리 버튼을 맨 앞에 배치) */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1350px]"
        style={{ gridTemplateColumns: "80px 80px 80px 1fr 70px 100px 80px 100px 100px 80px 90px 100px" }}
      >
        <div>관리</div>
        <div>진행상태</div>
        <div>코드</div>
        <div>업무협조</div>
        <div>우선순위</div>
        <div>카테고리</div>
        <div>문서</div>
        <div>요청자</div>
        <div>담당자</div>
        <div>요청일</div>
        <div>마감일</div>
        <div>연결 태스크</div>
      </div>

      {/* 빈 목록 */}
      {requirements.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">
            {totalCount === 0
              ? "등록된 업무협조가 없습니다."
              : "검색 조건에 맞는 업무협조가 없습니다."}
          </p>
        </div>
      )}

      {/* 업무협조 목록 */}
      {requirements.map((req) => {
        const priority = priorityConfig[req.priority] || priorityConfig.SHOULD;
        const status = statusConfig[req.status] || statusConfig.DRAFT;

        return (
          <div
            key={req.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1350px]"
            style={{ gridTemplateColumns: "80px 80px 80px 1fr 70px 100px 80px 100px 100px 80px 90px 100px" }}
          >
            {/* 수정/삭제 버튼 (맨 앞 배치) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(req)}
                className="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                title="수정"
              >
                <Icon name="edit" size="xs" />
              </button>
              <button
                onClick={() => onDelete(req.id, req.title)}
                className="size-7 rounded-lg flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                title="삭제"
              >
                <Icon name="delete" size="xs" />
              </button>
            </div>

            {/* 상태 배지 (클릭 시 드롭다운) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (openStatusDropdown === req.id) {
                    setOpenStatusDropdown(null);
                  } else {
                    setOpenStatusDropdown(req.id);
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - buttonRect.bottom;
                    const dropdownHeight = 200;
                    setDropdownOpenUpward(spaceBelow < dropdownHeight);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  req.status === "IMPLEMENTED"
                    ? "bg-primary/10 text-primary"
                    : req.status === "APPROVED"
                    ? "bg-success/10 text-success"
                    : req.status === "REJECTED"
                    ? "bg-error/10 text-error"
                    : "bg-slate-100 dark:bg-slate-800 text-text-secondary"
                }`}
                title="클릭하여 상태 변경"
              >
                <Icon name={status.icon} size="xs" />
                <span className="hidden sm:inline">{status.label}</span>
              </button>

              {/* 상태 변경 드롭다운 */}
              {openStatusDropdown === req.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenStatusDropdown(null)}
                  />
                  <div className={`absolute left-0 ${dropdownOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]`}>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(req.id, key)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                          req.status === key ? "bg-primary/5" : ""
                        }`}
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                        {req.status === key && (
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
                {req.code || `REQ-${req.id.slice(0, 6)}`}
              </span>
            </div>

            {/* 제목 + 설명 */}
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${
                req.status === "IMPLEMENTED"
                  ? "text-text-secondary line-through"
                  : "text-text dark:text-white"
              }`}>
                {req.title}
              </p>
              {req.description && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                  {req.description}
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
              <span className="text-xs text-text-secondary bg-surface dark:bg-background-dark px-2 py-1 rounded truncate block">
                {req.category || "-"}
              </span>
            </div>

            {/* OneDrive 문서 링크 */}
            <div>
              {req.oneDriveLink ? (
                <button
                  onClick={() => onPreviewDocument(req.oneDriveLink!)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  title="문서 미리보기"
                >
                  <Icon name="description" size="xs" />
                  <span>보기</span>
                </button>
              ) : (
                <span className="text-xs text-text-secondary">-</span>
              )}
            </div>

            {/* 요청자 */}
            <div>
              <div className="flex items-center gap-1">
                {req.requester?.avatar ? (
                  <img
                    src={req.requester.avatar}
                    alt={req.requester.name || ""}
                    className="size-5 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-primary font-medium">
                      {req.requester?.name?.[0] || "?"}
                    </span>
                  </div>
                )}
                <span className="text-xs text-text dark:text-white truncate">
                  {req.requester?.name || "-"}
                </span>
              </div>
            </div>

            {/* 담당자 */}
            <div>
              <div className="flex items-center gap-1">
                {req.assignee?.avatar ? (
                  <img
                    src={req.assignee.avatar}
                    alt={req.assignee.name || ""}
                    className="size-5 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-success font-medium">
                      {req.assignee?.name?.[0] || "?"}
                    </span>
                  </div>
                )}
                <span className="text-xs text-text dark:text-white truncate">
                  {req.assignee?.name || "-"}
                </span>
              </div>
            </div>

            {/* 요청일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(req.requestDate)}
              </span>
            </div>

            {/* 마감일 */}
            <div>
              <span className={`text-xs ${req.isDelayed ? "text-error font-medium" : "text-text-secondary"}`}>
                {formatDate(req.dueDate)}
                {req.isDelayed && " (지연)"}
              </span>
            </div>

            {/* 연결된 태스크 */}
            <div>
              {req._count?.tasks && req._count.tasks > 0 ? (
                <div className="relative group">
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                    <Icon name="task_alt" size="xs" />
                    <span>{req._count.tasks}개</span>
                  </div>
                  {/* 호버 시 태스크 목록 표시 */}
                  {req.tasks && req.tasks.length > 0 && (
                    <div className="absolute z-20 left-0 top-full mt-1 w-64 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-2 hidden group-hover:block">
                      <p className="text-xs font-semibold text-text dark:text-white mb-2">연결된 태스크</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {req.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 p-1.5 rounded bg-surface dark:bg-background-dark"
                          >
                            <span className={`size-2 rounded-full ${
                              task.status === "COMPLETED" ? "bg-success" :
                              task.status === "IN_PROGRESS" ? "bg-primary" :
                              task.status === "HOLDING" ? "bg-amber-500" :
                              task.status === "CANCELLED" ? "bg-red-500" :
                              "bg-slate-400"
                            }`} />
                            <span className="text-xs text-text dark:text-white truncate flex-1">
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-text-secondary">-</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
