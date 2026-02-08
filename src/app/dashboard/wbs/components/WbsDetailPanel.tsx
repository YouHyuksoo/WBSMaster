/**
 * @file src/app/dashboard/wbs/components/WbsDetailPanel.tsx
 * @description
 * WBS 상세보기 패널 컴포넌트입니다.
 * 우측 패널에서 선택된 항목의 수정 폼을 인라인으로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **selectedItem**: 트리에서 선택된 WBS 항목 (null이면 안내 표시)
 * 2. **formData**: 수정 폼 데이터 (NewItemForm 타입)
 * 3. **onSave**: 저장 버튼 클릭 시 호출
 */

"use client";

import { Icon, Button, Input } from "@/components/ui";
import type { WbsItem, TeamMember } from "@/lib/api";
import { levelNames, levelColors } from "../constants";
import type { NewItemForm } from "../types";

interface WbsDetailPanelProps {
  /** 선택된 WBS 항목 */
  selectedItem: WbsItem | null;
  /** 팀 멤버 목록 */
  teamMembers: TeamMember[];
  /** 폼 데이터 */
  formData: NewItemForm;
  /** 폼 데이터 변경 핸들러 */
  onFormChange: (data: Partial<NewItemForm>) => void;
  /** 저장 핸들러 */
  onSave: (e: React.FormEvent) => void;
  /** 저장 중 여부 */
  isSaving: boolean;
}

/**
 * WBS 상세보기 패널 컴포넌트
 */
export function WbsDetailPanel({
  selectedItem,
  teamMembers,
  formData,
  onFormChange,
  onSave,
  isSaving,
}: WbsDetailPanelProps) {
  /** 담당자 체크박스 토글 */
  const handleToggleAssignee = (userId: string, checked: boolean) => {
    if (checked) {
      onFormChange({ assigneeIds: [...formData.assigneeIds, userId] });
    } else {
      onFormChange({ assigneeIds: formData.assigneeIds.filter((id) => id !== userId) });
    }
  };

  // 항목 미선택 시 안내
  if (!selectedItem) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-white dark:bg-[#161b22]">
        <div className="text-center">
          <Icon name="touch_app" size="xl" className="text-text-secondary mb-4" />
          <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
            항목을 선택하세요
          </h3>
          <p className="text-text-secondary text-sm">
            좌측 트리에서 항목을 클릭하면 상세 정보를 편집할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-white dark:bg-[#161b22]">
      {/* 헤더 */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium text-white ${levelColors[formData.level]}`}>
            {levelNames[formData.level]}
          </span>
          <span className="text-sm font-mono text-text-secondary">{selectedItem.code}</span>
          <span className="text-sm font-medium text-text dark:text-white truncate max-w-[200px]">
            {selectedItem.name}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon="save"
          onClick={onSave}
          disabled={isSaving || !formData.name.trim()}
        >
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>

      {/* 폼 본문 (스크롤) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 기본 정보 섹션 */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Icon name="info" size="xs" />
            기본 정보
          </h3>
          <div className="space-y-3">
            {/* 항목명 */}
            <div>
              <label className="block text-xs font-medium text-text dark:text-white mb-1">
                항목명 <span className="text-error">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                placeholder="항목명 입력"
                required
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-xs font-medium text-text dark:text-white mb-1">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                placeholder="항목에 대한 상세 설명"
                className="w-full px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white resize-none h-20 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* 담당자 */}
            <div>
              <label className="block text-xs font-medium text-text dark:text-white mb-1">
                담당자{" "}
                {formData.assigneeIds.length > 0 && (
                  <span className="text-primary">({formData.assigneeIds.length}명)</span>
                )}
              </label>
              <div className="max-h-32 overflow-y-auto border border-border dark:border-border-dark rounded-lg bg-surface dark:bg-background-dark">
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-text-secondary p-3 text-center">팀 멤버가 없습니다.</p>
                ) : (
                  <div className="p-1.5 grid grid-cols-2 gap-1">
                    {teamMembers.map((member) => (
                      <label
                        key={member.userId}
                        className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer transition-colors text-xs ${
                          formData.assigneeIds.includes(member.userId)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-surface-hover dark:hover:bg-surface-dark border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.assigneeIds.includes(member.userId)}
                          onChange={(e) => handleToggleAssignee(member.userId, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-text dark:text-white truncate">
                          {member.user?.name || member.user?.email || "알 수 없음"}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 일정 섹션 */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Icon name="calendar_month" size="xs" />
            일정
          </h3>
          <div className="space-y-3">
            {/* 계획 일정 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text dark:text-white mb-1">계획 시작일</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => onFormChange({ startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text dark:text-white mb-1">계획 종료일</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => onFormChange({ endDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {/* 실제 일정 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">실제 시작일</label>
                <input
                  type="date"
                  value={formData.actualStartDate}
                  onChange={(e) => onFormChange({ actualStartDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-emerald-300 dark:border-emerald-700 text-text dark:text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">실제 종료일</label>
                <input
                  type="date"
                  value={formData.actualEndDate}
                  onChange={(e) => onFormChange({ actualEndDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-emerald-300 dark:border-emerald-700 text-text dark:text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 진행률 & 가중치 섹션 */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Icon name="speed" size="xs" />
            진행률 & 가중치
          </h3>
          <div className="space-y-3">
            {/* 진행률 */}
            <div className="bg-surface dark:bg-background-dark rounded-lg p-3">
              <label className="block text-xs font-medium text-text dark:text-white mb-2">진행률</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) => onFormChange({ progress: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-background-white dark:bg-surface-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex items-center gap-1 min-w-[70px]">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      onFormChange({ progress: val });
                    }}
                    className="w-14 px-2 py-1 text-center rounded bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm font-medium"
                  />
                  <span className="text-xs text-text-secondary">%</span>
                </div>
              </div>
              <div className="mt-2 h-2 bg-background-white dark:bg-surface-dark rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    formData.progress >= 80 ? "bg-emerald-500"
                    : formData.progress >= 50 ? "bg-sky-500"
                    : formData.progress >= 20 ? "bg-amber-500"
                    : "bg-primary"
                  }`}
                  style={{ width: `${formData.progress}%` }}
                />
              </div>
            </div>

            {/* 가중치 (대분류 LEVEL1만) */}
            {formData.level === "LEVEL1" && (
              <div className="bg-surface dark:bg-background-dark rounded-lg p-3">
                <label className="block text-xs font-medium text-text dark:text-white mb-2">
                  <span className="flex items-center gap-1.5">
                    <Icon name="percent" size="xs" className="text-primary" />
                    가중치 (%)
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={formData.weight}
                    onChange={(e) => onFormChange({ weight: parseInt(e.target.value) })}
                    className="flex-1 h-1.5 bg-background-white dark:bg-surface-dark rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex items-center gap-1 min-w-[70px]">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.weight}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                        onFormChange({ weight: val });
                      }}
                      className="w-14 px-2 py-1 text-center rounded bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white text-sm font-medium"
                    />
                    <span className="text-xs text-text-secondary">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 산출물 섹션 */}
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Icon name="description" size="xs" />
            산출물
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text dark:text-white mb-1">산출물명</label>
              <input
                type="text"
                value={formData.deliverableName}
                onChange={(e) => onFormChange({ deliverableName: e.target.value })}
                placeholder="예: 요구사항 정의서"
                className="w-full px-2.5 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text dark:text-white mb-1">산출물 링크</label>
              <div className="relative">
                <Icon name="link" size="xs" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="url"
                  value={formData.deliverableLink}
                  onChange={(e) => onFormChange({ deliverableLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white placeholder:text-text-secondary text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
