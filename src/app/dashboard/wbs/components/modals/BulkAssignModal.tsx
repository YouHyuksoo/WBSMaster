/**
 * @file src/app/dashboard/wbs/components/modals/BulkAssignModal.tsx
 * @description
 * 일괄 담당자 배정 모달 컴포넌트입니다.
 * 선택된 WBS 항목들에 담당자를 한 번에 배정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 표시 여부
 * 2. **checkedCount**: 선택된 항목 수
 * 3. **teamMembers**: 배정 가능한 팀 멤버 목록
 * 4. **onAssign**: 배정 버튼 클릭 시 호출
 *
 * 수정 방법:
 * - 배정 조건 변경: onAssign 핸들러 수정
 * - UI 변경: JSX 부분 수정
 */

"use client";

import { Icon, Button } from "@/components/ui";
import type { TeamMember } from "@/lib/api";

interface BulkAssignModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 선택된 항목 수 */
  checkedCount: number;
  /** 팀 멤버 목록 */
  teamMembers: TeamMember[];
  /** 선택된 담당자 ID 목록 */
  selectedAssigneeIds: string[];
  /** 담당자 선택 변경 핸들러 */
  onAssigneeChange: (ids: string[]) => void;
  /** 배정 핸들러 */
  onAssign: () => void;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/**
 * 일괄 담당자 배정 모달 컴포넌트
 */
export function BulkAssignModal({
  isOpen,
  checkedCount,
  teamMembers,
  selectedAssigneeIds,
  onAssigneeChange,
  onAssign,
  onClose,
}: BulkAssignModalProps) {
  if (!isOpen) return null;

  /** 담당자 체크박스 토글 */
  const handleToggleAssignee = (userId: string, checked: boolean) => {
    if (checked) {
      onAssigneeChange([...selectedAssigneeIds, userId]);
    } else {
      onAssigneeChange(selectedAssigneeIds.filter((id) => id !== userId));
    }
  };

  /** 모달 닫기 */
  const handleClose = () => {
    onAssigneeChange([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2">
            <Icon name="group_add" size="sm" className="text-primary" />
            <h2 className="text-lg font-bold text-text dark:text-white">
              일괄 담당자 배정
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="size-8 rounded-lg hover:bg-surface dark:hover:bg-background-dark flex items-center justify-center"
          >
            <Icon name="close" size="sm" className="text-text-secondary" />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-4 space-y-4">
          {/* 선택된 항목 수 */}
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Icon name="check_circle" size="sm" className="text-primary" />
            <span className="text-sm text-text dark:text-white">
              <strong className="text-primary">{checkedCount}개</strong> 항목이
              선택되었습니다.
            </span>
          </div>

          {/* 담당자 선택 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">
              배정할 담당자
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-border dark:border-border-dark rounded-lg p-2">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">
                  팀 멤버가 없습니다.
                </p>
              ) : (
                teamMembers.map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface dark:hover:bg-background-dark cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssigneeIds.includes(member.userId)}
                      onChange={(e) =>
                        handleToggleAssignee(member.userId, e.target.checked)
                      }
                      className="size-4 rounded border-border text-primary focus:ring-primary"
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
        </div>

        {/* 모달 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t border-border dark:border-border-dark">
          <Button variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={onAssign}
            disabled={selectedAssigneeIds.length === 0}
            leftIcon="group_add"
          >
            {selectedAssigneeIds.length > 0
              ? `${selectedAssigneeIds.length}명 배정`
              : "담당자 선택"}
          </Button>
        </div>
      </div>
    </div>
  );
}
