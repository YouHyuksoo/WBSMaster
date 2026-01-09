/**
 * @file src/app/dashboard/wbs/components/modals/WbsFormModal.tsx
 * @description
 * WBS 항목 추가/수정 모달 컴포넌트입니다.
 * 2열 레이아웃으로 기본 정보와 일정/산출물을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 표시 여부
 * 2. **editingItem**: 수정할 항목 (null이면 추가 모드)
 * 3. **formData**: 폼 데이터 (NewItemForm 타입)
 * 4. **onSubmit**: 저장 버튼 클릭 시 호출
 *
 * 수정 방법:
 * - 필드 추가: formData 타입과 JSX 수정
 * - 레이아웃 변경: grid 클래스 수정
 */

"use client";

import { Icon, Button, Input } from "@/components/ui";
import type { WbsItem, WbsLevel, TeamMember } from "@/lib/api";
import { levelNames, levelColors } from "../../constants";
import type { NewItemForm } from "../../types";

interface WbsFormModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 수정할 항목 (null이면 추가 모드) */
  editingItem: WbsItem | null;
  /** 팀 멤버 목록 */
  teamMembers: TeamMember[];
  /** 폼 데이터 */
  formData: NewItemForm;
  /** 폼 데이터 변경 핸들러 */
  onFormChange: (data: Partial<NewItemForm>) => void;
  /** 저장 핸들러 */
  onSubmit: (e: React.FormEvent) => void;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 저장 중 여부 */
  isSubmitting?: boolean;
}

/**
 * WBS 항목 추가/수정 모달 컴포넌트
 */
export function WbsFormModal({
  isOpen,
  editingItem,
  teamMembers,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  isSubmitting = false,
}: WbsFormModalProps) {
  if (!isOpen) return null;

  /** 담당자 체크박스 토글 */
  const handleToggleAssignee = (userId: string, checked: boolean) => {
    if (checked) {
      onFormChange({ assigneeIds: [...formData.assigneeIds, userId] });
    } else {
      onFormChange({
        assigneeIds: formData.assigneeIds.filter((id) => id !== userId),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white ${levelColors[formData.level]}`}
            >
              {levelNames[formData.level]}
            </span>
            <h2 className="text-lg font-bold text-text dark:text-white">
              {editingItem ? "WBS 항목 수정" : `${levelNames[formData.level]} 추가`}
            </h2>
            {formData.parentId && (
              <span className="text-xs text-text-secondary bg-surface dark:bg-background-dark px-2 py-1 rounded">
                상위 항목에 추가됨
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text dark:hover:text-white p-1 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
          >
            <Icon name="close" size="md" />
          </button>
        </div>

        {/* 모달 본문 - 2열 레이아웃 */}
        <form onSubmit={onSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측 컬럼: 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                <Icon name="info" size="sm" />
                기본 정보
              </h3>

              {/* 항목명 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  항목명 <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => onFormChange({ name: e.target.value })}
                  placeholder={`${levelNames[formData.level]} 항목명 입력`}
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
                  placeholder="항목에 대한 상세 설명을 입력하세요"
                  className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none h-24 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* 담당자 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1">
                  담당자{" "}
                  {formData.assigneeIds.length > 0 && (
                    <span className="text-primary">
                      ({formData.assigneeIds.length}명 선택)
                    </span>
                  )}
                </label>
                <div className="max-h-40 overflow-y-auto border border-border dark:border-border-dark rounded-lg bg-surface dark:bg-background-dark">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-text-secondary p-4 text-center">
                      팀 멤버가 없습니다. 먼저 팀 멤버를 추가해주세요.
                    </p>
                  ) : (
                    <div className="p-2 grid grid-cols-2 gap-1">
                      {teamMembers.map((member) => (
                        <label
                          key={member.userId}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            formData.assigneeIds.includes(member.userId)
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-surface-hover dark:hover:bg-surface-dark border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.assigneeIds.includes(member.userId)}
                            onChange={(e) =>
                              handleToggleAssignee(member.userId, e.target.checked)
                            }
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-text dark:text-white truncate">
                            {member.user?.name || member.user?.email || "알 수 없음"}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 우측 컬럼: 일정 및 산출물 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                <Icon name="calendar_month" size="sm" />
                일정 및 진행
              </h3>

              {/* 일정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => onFormChange({ startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                    className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* 진행률 (수정 모드에서만 표시) */}
              {editingItem && (
                <div className="bg-surface dark:bg-background-dark rounded-lg p-4">
                  <label className="block text-sm font-medium text-text dark:text-white mb-3">
                    진행률
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formData.progress}
                      onChange={(e) =>
                        onFormChange({ progress: parseInt(e.target.value) })
                      }
                      className="flex-1 h-2 bg-background-white dark:bg-surface-dark rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex items-center gap-1 min-w-[80px]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.progress}
                        onChange={(e) => {
                          const val = Math.min(
                            100,
                            Math.max(0, parseInt(e.target.value) || 0)
                          );
                          onFormChange({ progress: val });
                        }}
                        className="w-16 px-2 py-1.5 text-center rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm font-medium"
                      />
                      <span className="text-sm text-text-secondary font-medium">%</span>
                    </div>
                  </div>
                  {/* 진행률 미리보기 바 */}
                  <div className="mt-3 h-3 bg-background-white dark:bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        formData.progress >= 80
                          ? "bg-emerald-500"
                          : formData.progress >= 50
                          ? "bg-sky-500"
                          : formData.progress >= 20
                          ? "bg-amber-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${formData.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 가중치 섹션 (대분류 LEVEL1만) */}
              {formData.level === "LEVEL1" && (
                <div className="bg-surface dark:bg-background-dark rounded-lg p-4">
                  <label className="block text-sm font-medium text-text dark:text-white mb-3">
                    <span className="flex items-center gap-2">
                      <Icon name="percent" size="sm" className="text-primary" />
                      가중치 (%)
                      <span className="text-xs text-text-secondary font-normal">
                        (전체 100% 중 차지하는 비중)
                      </span>
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={formData.weight}
                      onChange={(e) =>
                        onFormChange({ weight: parseInt(e.target.value) })
                      }
                      className="flex-1 h-2 bg-background-white dark:bg-surface-dark rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex items-center gap-1 min-w-[80px]">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.weight}
                        onChange={(e) => {
                          const val = Math.min(
                            100,
                            Math.max(1, parseInt(e.target.value) || 1)
                          );
                          onFormChange({ weight: val });
                        }}
                        className="w-16 px-2 py-1.5 text-center rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm font-medium"
                      />
                      <span className="text-sm text-text-secondary font-medium">%</span>
                    </div>
                  </div>
                  {/* 가중치 시각화 바 */}
                  <div className="mt-3 h-3 bg-background-white dark:bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-primary"
                      style={{ width: `${formData.weight}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">
                    예: 분석 15%, 설계 20%, 개발 40%, 테스트 15%, 이행 10% = 총 100%
                  </p>
                </div>
              )}

              {/* 산출물 섹션 */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2 mb-3">
                  <Icon name="description" size="sm" />
                  산출물
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      산출물명
                    </label>
                    <input
                      type="text"
                      value={formData.deliverableName}
                      onChange={(e) =>
                        onFormChange({ deliverableName: e.target.value })
                      }
                      placeholder="예: 요구사항 정의서, 화면설계서"
                      className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      산출물 링크
                    </label>
                    <div className="relative">
                      <Icon
                        name="link"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      />
                      <input
                        type="url"
                        value={formData.deliverableLink}
                        onChange={(e) =>
                          onFormChange({ deliverableLink: e.target.value })
                        }
                        placeholder="https://..."
                        className="w-full pl-10 pr-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 모달 푸터 - 버튼 */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-border dark:border-border-dark bg-surface/50 dark:bg-background-dark/50">
            <Button type="button" variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={editingItem ? "save" : "add"}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "처리 중..."
                : editingItem
                ? "수정 완료"
                : "항목 추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
