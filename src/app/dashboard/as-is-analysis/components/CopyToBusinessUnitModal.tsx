/**
 * @file src/app/dashboard/as-is-analysis/components/CopyToBusinessUnitModal.tsx
 * @description
 * AS-IS 항목을 다른 사업부로 복사하는 모달 컴포넌트입니다.
 * 목적지 사업부를 선택하고 복사를 실행합니다.
 *
 * 초보자 가이드:
 * 1. **목적지 선택**: 복사할 대상 사업부 선택
 * 2. **복사 옵션**: 전체 복사 또는 선택 복사
 * 3. **하위 데이터 포함**: 단위업무 분석 및 모든 하위 테이블도 함께 복사
 *
 * 사용 예시:
 * ```tsx
 * <CopyToBusinessUnitModal
 *   isOpen={showCopyModal}
 *   onClose={() => setShowCopyModal(false)}
 *   sourceOverviewId={overview.id}
 *   sourceBusinessUnit={businessUnit}
 *   projectId={projectId}
 *   itemCount={overview.items.length}
 *   onSuccess={() => toast.success('복사 완료')}
 * />
 * ```
 */

"use client";

import { useState } from "react";
import { Icon, Button } from "@/components/ui";
import { BUSINESS_UNITS, type BusinessUnit } from "@/constants/business-units";

interface CopyToBusinessUnitModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 소스 Overview ID */
  sourceOverviewId: string;
  /** 소스 사업부 */
  sourceBusinessUnit: BusinessUnit;
  /** 프로젝트 ID */
  projectId: string;
  /** 전체 항목 수 */
  itemCount: number;
  /** 선택된 항목 ID 목록 (선택 복사용) */
  selectedItemIds?: string[];
  /** 복사 성공 시 콜백 */
  onSuccess?: () => void;
}

/**
 * AS-IS 항목 복사 모달 컴포넌트
 */
export function CopyToBusinessUnitModal({
  isOpen,
  onClose,
  sourceOverviewId,
  sourceBusinessUnit,
  projectId,
  itemCount,
  selectedItemIds,
  onSuccess,
}: CopyToBusinessUnitModalProps) {
  // 선택된 항목이 있으면 선택 복사, 없으면 전체 복사
  const isSelectCopy = selectedItemIds && selectedItemIds.length > 0;
  const copyCount = isSelectCopy ? selectedItemIds.length : itemCount;
  // 목적지 사업부 상태
  const [targetBusinessUnit, setTargetBusinessUnit] = useState<BusinessUnit | "">("");
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  // 에러 메시지
  const [error, setError] = useState<string | null>(null);

  // 선택 가능한 사업부 (현재 사업부 제외)
  const availableUnits = BUSINESS_UNITS.filter((unit) => unit !== sourceBusinessUnit);

  // 복사 실행
  const handleCopy = async () => {
    if (!targetBusinessUnit) {
      setError("목적지 사업부를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/as-is-analysis/items/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceOverviewId,
          targetBusinessUnit,
          projectId,
          // 선택된 항목이 있으면 해당 항목만 복사
          ...(isSelectCopy && { itemIds: selectedItemIds }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "복사에 실패했습니다.");
      }

      // 성공 시 콜백 호출 및 모달 닫기
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "복사 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    setTargetBusinessUnit("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 콘텐츠 */}
      <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-border dark:border-border-dark">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="content_copy" size="md" className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text dark:text-white">
                다른 사업부로 복사
              </h2>
              <p className="text-sm text-text-secondary">
                AS-IS 분석 항목을 다른 사업부로 복사합니다
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
          >
            <Icon name="close" size="sm" className="text-text-secondary" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 소스 정보 */}
          <div className="p-4 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="source" size="xs" className="text-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">
                복사할 데이터
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500">
                  <Icon name="business" size="xs" />
                  <span className="text-sm font-medium">{sourceBusinessUnit}</span>
                </div>
                <Icon name="arrow_forward" size="xs" className="text-text-secondary" />
                <span className="text-sm text-text-secondary">
                  {isSelectCopy ? "선택한 항목" : "전체 항목"}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-sm font-bold ${
                isSelectCopy ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
              }`}>
                {copyCount}개
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-3">
              * 단위업무 분석, Flow Chart, 인터뷰, 이슈 등 모든 하위 데이터가 함께 복사됩니다.
            </p>
          </div>

          {/* 목적지 선택 */}
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">
              목적지 사업부 선택
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableUnits.map((unit) => (
                <button
                  key={unit}
                  onClick={() => setTargetBusinessUnit(unit)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    targetBusinessUnit === unit
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface dark:bg-background-dark border-border dark:border-border-dark text-text-secondary hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon
                      name={targetBusinessUnit === unit ? "check_circle" : "business"}
                      size="sm"
                      className={targetBusinessUnit === unit ? "text-primary" : "text-text-secondary"}
                    />
                    <span>{unit}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
              <Icon name="error" size="sm" className="text-error" />
              <span className="text-sm text-error">{error}</span>
            </div>
          )}

          {/* 주의사항 */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Icon name="info" size="sm" className="text-warning mt-0.5" />
            <div className="text-sm text-warning">
              <p className="font-medium">주의사항</p>
              <ul className="mt-1 space-y-0.5 text-xs opacity-80">
                <li>• 목적지에 동일한 항목이 있어도 새로 추가됩니다.</li>
                <li>• 관리번호는 목적지에서 새로 발급받아야 합니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border dark:border-border-dark bg-surface/50 dark:bg-background-dark/50">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            variant="primary"
            leftIcon="content_copy"
            onClick={handleCopy}
            disabled={!targetBusinessUnit || isLoading}
            isLoading={isLoading}
          >
            {isLoading ? "복사 중..." : `${targetBusinessUnit || "선택"}(으)로 복사`}
          </Button>
        </div>
      </div>
    </div>
  );
}
