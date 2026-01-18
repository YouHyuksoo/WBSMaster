/**
 * @file src/app/dashboard/discussion-items/components/DiscussionItemTable.tsx
 * @description
 * 협의요청 테이블 컴포넌트입니다.
 * 협의요청 목록을 표시하고 상태 변경, 수정, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **상태 배지**: 클릭 시 드롭다운으로 상태 변경
 * 2. **선택지**: 옵션 수 표시, 클릭 시 상세 보기
 * 3. **수정/삭제**: 각 행 우측의 버튼
 */

"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui";
import {
  type DiscussionItem,
  type DiscussionStatus,
  STATUS_CONFIG,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
} from "../types";
import { formatDateShort } from "@/lib/date";

interface DiscussionItemTableProps {
  items: DiscussionItem[];
  onEdit: (item: DiscussionItem) => void;
  onDelete: (item: DiscussionItem) => void;
  onStatusChange: (id: string, status: DiscussionStatus) => void;
}

/**
 * 협의요청 테이블 컴포넌트
 */
export function DiscussionItemTable({
  items,
  onEdit,
  onDelete,
  onStatusChange,
}: DiscussionItemTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openOptionsModal, setOpenOptionsModal] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    (id: string, status: DiscussionStatus) => {
      onStatusChange(id, status);
      setOpenDropdown(null);
    },
    [onStatusChange]
  );

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
      {/* 테이블 헤더 */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase"
        style={{
          gridTemplateColumns: "120px 100px 100px 80px 1fr 80px 80px 100px 100px 80px",
        }}
      >
        <div>상태</div>
        <div>코드</div>
        <div>사업부</div>
        <div>요청자</div>
        <div>협의 주제</div>
        <div>단계</div>
        <div>우선순위</div>
        <div>선택지</div>
        <div>협의 기한</div>
        <div className="text-center">수정</div>
      </div>

      {/* 빈 목록 */}
      {items.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4 mx-auto" />
          <p className="text-text-secondary">등록된 협의요청이 없습니다.</p>
        </div>
      )}

      {/* 목록 아이템 */}
      {items.map((item) => {
        const statusConfig = STATUS_CONFIG[item.status];
        const stageConfig = STAGE_CONFIG[item.stage];
        const priorityConfig = PRIORITY_CONFIG[item.priority];

        return (
          <div
            key={item.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center"
            style={{
              gridTemplateColumns: "120px 100px 100px 80px 1fr 80px 80px 100px 100px 80px",
            }}
          >
            {/* 상태 배지 (드롭다운) */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} w-full`}
              >
                <Icon name={statusConfig.icon} size="xs" />
                <span className="truncate">{statusConfig.label}</span>
              </button>

              {/* 드롭다운 메뉴 */}
              {openDropdown === item.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[160px]">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(item.id, key as DiscussionStatus)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                          item.status === key ? "bg-primary/5" : ""
                        }`}
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                        {item.status === key && (
                          <Icon name="check" size="xs" className="ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 코드 */}
            <div className="text-sm font-mono text-text dark:text-white">{item.code}</div>

            {/* 사업부 */}
            <div className="text-sm text-text dark:text-white">{item.businessUnit}</div>

            {/* 요청자 */}
            <div className="text-sm text-text dark:text-white truncate" title={item.requesterName || ""}>
              {item.requesterName || "-"}
            </div>

            {/* 협의 주제 */}
            <div className="text-sm text-text dark:text-white truncate" title={item.title}>
              {item.title}
            </div>

            {/* 단계 */}
            <div className="flex items-center gap-1">
              <Icon name={stageConfig.icon} size="xs" className={stageConfig.color} />
              <span className={`text-xs ${stageConfig.color}`}>{stageConfig.label}</span>
            </div>

            {/* 우선순위 */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${priorityConfig.bgColor}`}>
              <Icon name={priorityConfig.icon} size="xs" className={priorityConfig.color} />
              <span className={`text-xs ${priorityConfig.color}`}>{priorityConfig.label}</span>
            </div>

            {/* 선택지 */}
            <div className="relative">
              <button
                onClick={() => setOpenOptionsModal(openOptionsModal === item.id ? null : item.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
              >
                <Icon name="format_list_numbered" size="xs" />
                <span>{item.options?.length || 0}개</span>
              </button>

              {/* 선택지 모달 */}
              {openOptionsModal === item.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenOptionsModal(null)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-3 min-w-[300px] max-w-[400px]">
                    <div className="space-y-2">
                      {item.options && item.options.length > 0 ? (
                        item.options.map((opt, idx) => (
                          <div key={idx} className="p-2 bg-surface dark:bg-background-dark rounded">
                            <p className="text-xs font-semibold text-text dark:text-white mb-1">
                              {opt.label}
                            </p>
                            <p className="text-xs text-text-secondary">{opt.description}</p>
                            {(opt.cost || opt.duration) && (
                              <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                                {opt.cost && <span>비용: {opt.cost.toLocaleString()}원</span>}
                                {opt.duration && <span>기간: {opt.duration}일</span>}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-text-secondary">선택지가 없습니다.</p>
                      )}
                    </div>

                    {/* 최종 결정 */}
                    {item.decision && (
                      <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
                        <p className="text-xs font-semibold text-success mb-1">최종 결정</p>
                        <p className="text-xs text-text dark:text-white">{item.decision}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 협의 기한 */}
            <div className="text-xs text-text-secondary">
              {item.dueDate ? formatDateShort(item.dueDate) : "-"}
            </div>

            {/* 수정/삭제 */}
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                title="수정"
              >
                <Icon name="edit" size="xs" />
              </button>
              <button
                onClick={() => onDelete(item)}
                className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                title="삭제"
              >
                <Icon name="delete" size="xs" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
