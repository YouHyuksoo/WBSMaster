/**
 * @file src/app/dashboard/holidays/components/HolidayModal.tsx
 * @description
 * 일정 추가/수정 모달 컴포넌트입니다.
 * 일정의 제목, 설명, 유형, 담당자, 날짜/시간을 입력받습니다.
 *
 * 초보자 가이드:
 * 1. **mode**: 'add' (추가) 또는 'edit' (수정) 모드
 * 2. **폼 필드**: 제목, 설명, 유형, 담당자, 종일 여부, 날짜, 시간
 * 3. **담당자**: 프로젝트 멤버 목록에서 선택
 */

"use client";

import { Icon, Button, Input } from "@/components/ui";
import type { Holiday } from "@/lib/api";
import { HolidayFormState } from "../types";

interface Member {
  userId: string;
  user?: {
    name?: string | null;
    email: string;
    avatar?: string | null;
  } | null;
}

interface HolidayModalProps {
  /** 모달 모드: 추가 또는 수정 */
  mode: "add" | "edit";
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 폼 상태 */
  formData: HolidayFormState;
  /** 폼 상태 변경 핸들러 */
  onFormChange: (data: Partial<HolidayFormState>) => void;
  /** 폼 제출 핸들러 */
  onSubmit: (e: React.FormEvent) => void;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 프로젝트 멤버 목록 */
  members: Member[];
  /** 제출 중 상태 */
  isSubmitting: boolean;
  /** 수정 모드에서 기존 일정 정보 (등록자 표시용) */
  editingHoliday?: Holiday | null;
}

/**
 * 일정 추가/수정 모달 컴포넌트
 */
export function HolidayModal({
  mode,
  isOpen,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  members,
  isSubmitting,
  editingHoliday,
}: HolidayModalProps) {
  if (!isOpen) return null;

  const isEditMode = mode === "edit";
  const title = isEditMode ? "일정 수정" : "일정 추가";
  const submitText = isEditMode ? "저장" : "추가";
  const submittingText = isEditMode ? "저장 중..." : "추가 중...";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text dark:text-white">{title}</h2>
          {/* 수정 모드: 등록자 정보 */}
          {isEditMode && editingHoliday?.user && (
            <div className="flex items-center gap-2">
              {editingHoliday.user.avatar ? (
                <img
                  src={editingHoliday.user.avatar}
                  alt={editingHoliday.user.name || "사용자"}
                  className="size-6 rounded-full object-cover"
                />
              ) : (
                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="person" size="xs" className="text-primary" />
                </div>
              )}
              <span className="text-xs text-text-secondary">
                {editingHoliday.user.name || editingHoliday.user.email}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* 일정 제목 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              일정 제목 *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => onFormChange({ title: e.target.value })}
              placeholder="예: 팀 회의, 휴가"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="일정에 대한 상세 설명"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none"
            />
          </div>

          {/* 유형 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              유형
            </label>
            <select
              value={formData.type}
              onChange={(e) => onFormChange({ type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
            >
              <option value="PERSONAL_SCHEDULE">개인 일정</option>
              <option value="MEETING">회의</option>
              <option value="DEADLINE">마감일</option>
              <option value="COMPANY_HOLIDAY">회사 휴일</option>
              <option value="TEAM_OFFSITE">팀 오프사이트</option>
              <option value="PERSONAL_LEAVE">개인 휴가</option>
              <option value="OTHER">기타</option>
            </select>
          </div>

          {/* 담당자 선택 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-1">
              담당자
            </label>
            <select
              value={formData.userId}
              onChange={(e) => onFormChange({ userId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
            >
              <option value="">선택 안함</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.name || member.user?.email || "알 수 없음"}
                </option>
              ))}
            </select>
          </div>

          {/* 종일 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${mode}IsAllDay`}
              checked={formData.isAllDay}
              onChange={(e) => onFormChange({ isAllDay: e.target.checked })}
              className="rounded border-border"
            />
            <label htmlFor={`${mode}IsAllDay`} className="text-sm text-text dark:text-white">
              종일
            </label>
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-1">
                시작일 *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => onFormChange({ date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-1">
                종료일
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => onFormChange({ endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
              />
            </div>
          </div>

          {/* 시간 (종일이 아닌 경우) */}
          {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  시작 시간
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => onFormChange({ startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => onFormChange({ endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? submittingText : submitText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
