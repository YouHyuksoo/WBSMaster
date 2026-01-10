/**
 * @file src/components/dashboard/RowModal.tsx
 * @description
 * 타임라인 행 생성/수정 모달 컴포넌트입니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 열림 상태
 * 2. **row**: 수정할 행 (null이면 생성 모드)
 * 3. **onSave**: 저장 콜백 (name, color 전달)
 *
 * 수정 방법:
 * - 색상 옵션 변경: COLOR_OPTIONS 배열 수정
 * - 필드 추가: form 상태와 JSX에 새 입력 필드 추가
 */

"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui";
import type { TimelineRow } from "@/lib/api";

interface RowModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 수정할 행 (null이면 생성 모드) */
  row: TimelineRow | null;
  /** 저장 핸들러 */
  onSave: (data: { name: string; color: string; parentId?: string | null }) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 사용 가능한 모든 행 목록 (부모 선택용) */
  availableRows?: TimelineRow[];
}

/** 색상 옵션 */
const COLOR_OPTIONS = [
  "#94A3B8", // 슬레이트
  "#3B82F6", // 파랑
  "#10B981", // 초록
  "#F59E0B", // 주황
  "#EF4444", // 빨강
  "#8B5CF6", // 보라
  "#EC4899", // 분홍
  "#06B6D4", // 청록
];

/**
 * 행 모달 컴포넌트
 */
export function RowModal({
  isOpen,
  onClose,
  row,
  onSave,
  isLoading = false,
  availableRows = [],
}: RowModalProps) {
  // 폼 상태
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [parentId, setParentId] = useState<string | null>(null);

  // 수정 모드 여부
  const isEditMode = !!row?.id;
  // 자식 행 생성 모드 (부모 ID가 미리 설정되어 있는 경우)
  const isChildMode = !isEditMode && row?.parentId;

  // 행 데이터로 폼 초기화
  useEffect(() => {
    if (row && row.id) {
      // 수정 모드
      setName(row.name);
      setColor(row.color);
      setParentId(row.parentId || null);
    } else if (row?.parentId) {
      // 자식 행 추가 모드 (부모 ID가 설정되어 있음)
      setName("");
      setColor(COLOR_OPTIONS[0]);
      setParentId(row.parentId);
    } else {
      // 최상위 행 생성 모드
      setName("");
      setColor(COLOR_OPTIONS[0]);
      setParentId(null);
    }
  }, [row, isOpen]);

  // 저장 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, parentId: isChildMode ? parentId : undefined });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {isEditMode ? "행 수정" : isChildMode ? "자식 행 추가" : "행 추가"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Icon name="close" size="md" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              행 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 태스크, 인프라"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* 부모 행 선택 (최상위 행 생성 모드일 때만 표시) */}
          {!isEditMode && !isChildMode && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                부모 행 (선택사항)
              </label>
              <select
                value={parentId || ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">부모 행 없음 (최상위)</option>
                {availableRows
                  .filter((r) => !r.parentId) // 최상위 행들만 선택 가능
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 색상 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              색상
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c
                      ? "border-slate-900 dark:border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoading ? "저장 중..." : isEditMode ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
