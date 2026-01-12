/**
 * @file src/app/dashboard/wbs/components/modals/BulkTaskAssignModal.tsx
 * @description
 * WBS 항목을 TASK로 일괄 배정하는 모달 컴포넌트입니다.
 * 선택된 WBS 항목들을 TASK(대기 상태)로 자동 등록하고 담당자를 배정합니다.
 *
 * 초보자 가이드:
 * 1. **자동 배정**: WBS에 담당자가 이미 있으면 해당 담당자로 배정
 * 2. **수동 배정**: 담당자가 없는 항목은 모달에서 선택
 * 3. **상태**: PENDING(대기) 상태로 TASK 생성
 *
 * 수정 방법:
 * - 배정 조건 변경: onAssign 핸들러 수정
 * - UI 변경: JSX 부분 수정
 */

"use client";

import { useState } from "react";
import { Icon, Button } from "@/components/ui";
import type { TeamMember, WbsItem } from "@/lib/api";

interface BulkTaskAssignModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 선택된 WBS 항목들 */
  selectedItems: WbsItem[];
  /** 팀 멤버 목록 */
  teamMembers: TeamMember[];
  /** TASK 배정 핸들러 */
  onAssign: (assigneeId: string | null) => void;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * TASK 일괄 배정 모달 컴포넌트
 */
export function BulkTaskAssignModal({
  isOpen,
  selectedItems,
  teamMembers,
  onAssign,
  onClose,
  isLoading = false,
}: BulkTaskAssignModalProps) {
  if (!isOpen) return null;

  /** 담당자가 없는 항목 수 */
  const itemsWithoutAssignee = selectedItems.filter(
    (item) => !item.assignees || item.assignees.length === 0
  );

  /** 담당자가 있는 항목 수 */
  const itemsWithAssignee = selectedItems.filter(
    (item) => item.assignees && item.assignees.length > 0
  );

  /** 선택된 담당자 ID (담당자 없는 항목에 배정) */
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

  /** 배정 핸들러 */
  const handleAssign = () => {
    // 담당자가 없는 항목이 있고 담당자를 선택하지 않은 경우
    if (itemsWithoutAssignee.length > 0 && !selectedAssigneeId) {
      return;
    }
    onAssign(selectedAssigneeId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2">
            <Icon name="task_alt" size="sm" className="text-primary" />
            <h2 className="text-lg font-bold text-text dark:text-white">
              TASK 일괄 배정
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-surface dark:hover:bg-background-dark flex items-center justify-center"
          >
            <Icon name="close" size="sm" className="text-text-secondary" />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-4 space-y-4">
          {/* 선택된 항목 요약 */}
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Icon name="check_circle" size="sm" className="text-primary" />
            <span className="text-sm text-text dark:text-white">
              <strong className="text-primary">{selectedItems.length}개</strong> 항목을
              TASK로 등록합니다.
            </span>
          </div>

          {/* 담당자 배정 안내 */}
          {itemsWithAssignee.length > 0 && (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-start gap-2">
                <Icon name="info" size="sm" className="text-success mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success mb-1">
                    자동 배정 항목: {itemsWithAssignee.length}개
                  </p>
                  <p className="text-xs text-text-secondary">
                    이미 담당자가 지정된 항목은 해당 담당자에게 자동 배정됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 담당자 선택 (담당자 없는 항목이 있을 때) */}
          {itemsWithoutAssignee.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="person_add" size="sm" className="text-warning" />
                <label className="block text-sm font-medium text-text dark:text-white">
                  담당자 미지정 항목: {itemsWithoutAssignee.length}개
                </label>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                담당자가 없는 항목에 배정할 담당자를 선택하세요.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-border dark:border-border-dark rounded-lg p-2">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-4">
                    팀 멤버가 없습니다.
                  </p>
                ) : (
                  teamMembers.map((member) => (
                    <label
                      key={member.userId}
                      className={`flex items-center gap-3 p-2 rounded-lg hover:bg-surface dark:hover:bg-background-dark cursor-pointer transition-colors ${
                        selectedAssigneeId === member.userId
                          ? "bg-primary/10 border border-primary/30"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="assignee"
                        checked={selectedAssigneeId === member.userId}
                        onChange={() => setSelectedAssigneeId(member.userId)}
                        className="size-4 text-primary focus:ring-primary"
                      />
                      {member.user?.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt={member.user?.name || ""}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {member.user?.name?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text dark:text-white">
                          {member.user?.name || "알 수 없음"}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {member.role}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 상태 안내 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Icon name="pending_actions" size="sm" className="text-gray-500" />
              <p className="text-xs text-text-secondary">
                모든 TASK는 <strong className="text-text dark:text-white">대기(PENDING)</strong> 상태로 생성됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t border-border dark:border-border-dark">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={
              isLoading ||
              (itemsWithoutAssignee.length > 0 && !selectedAssigneeId)
            }
            leftIcon="task_alt"
          >
            {isLoading ? "등록 중..." : `${selectedItems.length}개 TASK 등록`}
          </Button>
        </div>
      </div>
    </div>
  );
}
