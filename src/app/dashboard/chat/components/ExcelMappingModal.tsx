/**
 * @file src/app/dashboard/chat/components/ExcelMappingModal.tsx
 * @description
 * 엑셀 컬럼 매핑 확인 및 수정 모달입니다.
 * AI가 추천한 매핑을 사용자가 확인하고 수정할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **매핑 테이블**: 엑셀 컬럼 → 타겟 필드 매핑을 보여줌
 * 2. **드롭다운**: 각 컬럼의 매핑 대상을 변경 가능
 * 3. **미리보기**: 샘플 데이터로 매핑 결과 확인
 * 4. **확인 버튼**: 최종 매핑으로 벌크 임포트 실행
 */

"use client";

import { useState, useMemo } from "react";
import { Icon, Button, useToast } from "@/components/ui";

/**
 * 타겟 타입별 필드 정의
 */
const TARGET_FIELDS: Record<string, { label: string; fields: { value: string; label: string }[] }> = {
  task: {
    label: "태스크",
    fields: [
      { value: "title", label: "제목 (필수)" },
      { value: "description", label: "설명" },
      { value: "priority", label: "우선순위" },
      { value: "status", label: "상태" },
      { value: "startDate", label: "시작일" },
      { value: "dueDate", label: "마감일" },
      { value: "assignee", label: "담당자" },
    ],
  },
  issue: {
    label: "이슈",
    fields: [
      { value: "title", label: "제목 (필수)" },
      { value: "description", label: "설명" },
      { value: "priority", label: "우선순위" },
      { value: "category", label: "카테고리" },
      { value: "status", label: "상태" },
      { value: "dueDate", label: "목표 해결일" },
      { value: "assignee", label: "담당자" },
    ],
  },
  requirement: {
    label: "요구사항",
    fields: [
      { value: "title", label: "제목 (필수)" },
      { value: "description", label: "설명" },
      { value: "priority", label: "우선순위" },
      { value: "category", label: "카테고리" },
      { value: "status", label: "상태" },
      { value: "dueDate", label: "마감일" },
      { value: "assignee", label: "담당자" },
    ],
  },
};

/**
 * ExcelMappingModal Props
 */
interface ExcelMappingModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 엑셀 헤더 배열 */
  headers: string[];
  /** 샘플 데이터 (최대 5행) */
  sampleData: Record<string, unknown>[];
  /** 전체 데이터 행 수 */
  totalRows: number;
  /** 등록 대상 타입 */
  targetType: "task" | "issue" | "requirement";
  /** AI 추천 매핑 */
  suggestedMappings: Record<string, string>;
  /** 매핑 확인 핸들러 */
  onConfirm: (mappings: Record<string, string>) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 엑셀 컬럼 매핑 확인 모달
 */
export function ExcelMappingModal({
  isOpen,
  onClose,
  headers,
  sampleData,
  totalRows,
  targetType,
  suggestedMappings,
  onConfirm,
  isLoading = false,
}: ExcelMappingModalProps) {
  const toast = useToast();

  // 매핑 상태 (수정 가능)
  const [mappings, setMappings] = useState<Record<string, string>>(suggestedMappings);

  // 타겟 필드 정보
  const targetInfo = TARGET_FIELDS[targetType];

  // title 매핑 여부 확인
  const hasTitleMapping = useMemo(() => {
    return Object.values(mappings).includes("title");
  }, [mappings]);

  // 매핑 변경 핸들러
  const handleMappingChange = (header: string, field: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };

      // 빈 값이면 매핑 제거
      if (!field) {
        delete newMappings[header];
        return newMappings;
      }

      // 이미 다른 컬럼에서 사용 중인 필드면 해당 매핑 제거
      for (const [key, value] of Object.entries(newMappings)) {
        if (value === field && key !== header) {
          delete newMappings[key];
        }
      }

      newMappings[header] = field;
      return newMappings;
    });
  };

  // 확인 버튼 클릭
  const handleConfirm = () => {
    if (!hasTitleMapping) {
      toast.error("'제목' 필드는 필수입니다. 매핑을 설정해주세요.");
      return;
    }
    onConfirm(mappings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-slide-in-up">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="table_chart" size="sm" className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text dark:text-white">컬럼 매핑 확인</h2>
              <p className="text-sm text-text-secondary">
                AI가 추천한 매핑을 확인하고 필요시 수정하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
          >
            <Icon name="close" size="sm" className="text-text-secondary" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* 요약 정보 */}
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-surface dark:bg-background-dark">
            <div className="flex items-center gap-2">
              <Icon name="description" size="xs" className="text-emerald-500" />
              <span className="text-sm text-text dark:text-white">
                총 <strong>{totalRows}건</strong>의 데이터
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="arrow_forward" size="xs" className="text-text-secondary" />
              <span className="text-sm text-text dark:text-white">
                <strong>{targetInfo.label}</strong>로 등록
              </span>
            </div>
            {!hasTitleMapping && (
              <div className="flex items-center gap-2 text-error">
                <Icon name="warning" size="xs" />
                <span className="text-sm font-medium">제목 매핑 필요</span>
              </div>
            )}
          </div>

          {/* 매핑 테이블 */}
          <div className="overflow-x-auto border border-border dark:border-border-dark rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-surface dark:bg-background-dark">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary whitespace-nowrap">
                    엑셀 컬럼
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary whitespace-nowrap">
                    샘플 데이터
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary whitespace-nowrap">
                    매핑 대상
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border-dark">
                {headers.map((header) => (
                  <tr key={header} className="hover:bg-surface/50 dark:hover:bg-background-dark/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-text dark:text-white">{header}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-sm text-text-secondary truncate block">
                        {String(sampleData[0]?.[header] ?? "-")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mappings[header] || ""}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg text-sm bg-background dark:bg-surface-dark border transition-colors ${
                          mappings[header] === "title"
                            ? "border-primary text-primary"
                            : mappings[header]
                            ? "border-emerald-500 text-text dark:text-white"
                            : "border-border dark:border-border-dark text-text-secondary"
                        }`}
                      >
                        <option value="">매핑 안함</option>
                        {targetInfo.fields.map((field) => {
                          // 이미 다른 컬럼에서 사용 중인 필드는 비활성화
                          const isUsed = Object.entries(mappings).some(
                            ([key, value]) => value === field.value && key !== header
                          );
                          return (
                            <option key={field.value} value={field.value} disabled={isUsed}>
                              {field.label} {isUsed ? "(사용됨)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 미리보기 */}
          {sampleData.length > 0 && hasTitleMapping && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-text dark:text-white mb-2">미리보기 (첫 번째 항목)</h3>
              <div className="p-3 rounded-lg bg-surface dark:bg-background-dark space-y-2">
                {Object.entries(mappings).map(([header, field]) => (
                  <div key={header} className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary w-24">{field}:</span>
                    <span className="text-text dark:text-white">
                      {String(sampleData[0]?.[header] ?? "-")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-4 border-t border-border dark:border-border-dark bg-surface/50 dark:bg-background-dark/50">
          <p className="text-sm text-text-secondary">
            {Object.keys(mappings).length}개 컬럼 매핑됨
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!hasTitleMapping || isLoading}
              leftIcon={isLoading ? "progress_activity" : "upload"}
            >
              {isLoading ? "등록 중..." : `${totalRows}건 등록하기`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExcelMappingModal;
