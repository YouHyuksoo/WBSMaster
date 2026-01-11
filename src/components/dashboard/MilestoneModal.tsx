/**
 * @file src/components/dashboard/MilestoneModal.tsx
 * @description
 * 마일스톤 생성/수정/삭제 모달 컴포넌트입니다.
 * 시작일/종료일 기간 설정과 행 선택 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **isOpen**: 모달 열림 상태
 * 2. **milestone**: 수정할 마일스톤 (null이면 생성 모드)
 * 3. **projectId**: 새 마일스톤을 생성할 프로젝트 ID
 * 4. **rows**: 선택 가능한 타임라인 행 목록
 *
 * 수정 방법:
 * - 필드 추가: form 상태와 JSX에 새 입력 필드 추가
 * - 색상 옵션 변경: COLOR_OPTIONS 배열 수정
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ui";
import {
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from "@/hooks/useMilestones";
import type { Milestone, MilestoneStatus, TimelineRow } from "@/lib/api";

interface MilestoneModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 수정할 마일스톤 (null이면 생성 모드) */
  milestone: Milestone | null;
  /** 프로젝트 ID */
  projectId: string;
  /** 선택 가능한 타임라인 행 목록 */
  rows?: TimelineRow[];
}

/** 상태 옵션 */
const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "PENDING", label: "대기" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "COMPLETED", label: "완료" },
  { value: "DELAYED", label: "지연" },
];

/** 색상 옵션 */
const COLOR_OPTIONS = [
  "#3B82F6", // 파랑
  "#10B981", // 초록
  "#F59E0B", // 주황
  "#EF4444", // 빨강
  "#8B5CF6", // 보라
  "#EC4899", // 분홍
  "#06B6D4", // 청록
  "#94A3B8", // 회색
];

/**
 * 마일스톤 모달 컴포넌트
 */
export function MilestoneModal({
  isOpen,
  onClose,
  milestone,
  projectId,
  rows = [],
}: MilestoneModalProps) {
  // 폼 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("PENDING");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [rowId, setRowId] = useState<string>(""); // 선택된 그룹 ID (표시용)
  const [originalRowId, setOriginalRowId] = useState<string | null>(null); // 원래 rowId (수정 모드에서 보존)
  const [rowIdChanged, setRowIdChanged] = useState(false); // 사용자가 그룹을 변경했는지 여부

  // 에러/확인 모달 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 뮤테이션 훅
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  // 수정 모드 여부
  const isEditMode = !!milestone;

  // 그룹(부모 행)만 필터링 - parentId가 null인 행들
  const groupRows = useMemo(() => {
    return rows.filter((row) => !row.parentId);
  }, [rows]);

  // 마일스톤 데이터로 폼 초기화
  useEffect(() => {
    if (milestone) {
      setName(milestone.name);
      setDescription(milestone.description || "");
      setStartDate(milestone.startDate.split("T")[0]);
      setEndDate(milestone.endDate.split("T")[0]);
      setStatus(milestone.status);
      setColor(milestone.color);
      // 수정 모드: 원래 rowId 보존
      setOriginalRowId(milestone.rowId || null);
      setRowIdChanged(false);
      // 현재 rowId가 자식 행이면 부모 그룹 ID로 표시
      const currentRow = rows.find((r) => r.id === milestone.rowId);
      if (currentRow?.parentId) {
        // 자식 행이면 부모 ID로 표시
        setRowId(currentRow.parentId);
      } else {
        setRowId(milestone.rowId || "");
      }
    } else {
      // 생성 모드 - 폼 초기화
      setName("");
      setDescription("");
      // 기본값: 오늘부터 7일간
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      setStartDate(today.toISOString().split("T")[0]);
      setEndDate(nextWeek.toISOString().split("T")[0]);
      setStatus("PENDING");
      setColor(COLOR_OPTIONS[0]);
      // 첫 번째 그룹을 기본 선택
      setRowId(groupRows.length > 0 ? groupRows[0].id : "");
      setOriginalRowId(null);
      setRowIdChanged(false);
    }
    // 에러/확인 상태 초기화
    setErrorMessage(null);
    setShowDeleteConfirm(false);
  }, [milestone, isOpen, rows, groupRows]);

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !startDate || !endDate) return;

    // 시작일이 종료일보다 늦으면 에러 모달 표시
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage("시작일은 종료일보다 빨라야 합니다.");
      return;
    }

    try {
      if (isEditMode && milestone) {
        // 수정 모드: 그룹이 변경되지 않았으면 원래 rowId 유지
        const finalRowId = rowIdChanged ? (rowId || null) : originalRowId;
        await updateMilestone.mutateAsync({
          id: milestone.id,
          data: {
            name,
            description,
            startDate,
            endDate,
            status,
            color,
            rowId: finalRowId,
          },
        });
      } else {
        // 생성 모드: 선택한 그룹 ID 사용
        await createMilestone.mutateAsync({
          name,
          description,
          startDate,
          endDate,
          status,
          color,
          projectId,
          rowId: rowId || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("마일스톤 저장 실패:", error);
      setErrorMessage("마일스톤 저장에 실패했습니다.");
    }
  };

  // 삭제 확인 핸들러
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // 삭제 실행 핸들러
  const handleDeleteConfirm = async () => {
    if (!milestone) return;

    try {
      await deleteMilestone.mutateAsync({
        id: milestone.id,
        projectId,
      });
      onClose();
    } catch (error) {
      console.error("마일스톤 삭제 실패:", error);
      setErrorMessage("마일스톤 삭제에 실패했습니다.");
    }
    setShowDeleteConfirm(false);
  };

  if (!isOpen) return null;

  const isLoading =
    createMilestone.isPending ||
    updateMilestone.isPending ||
    deleteMilestone.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {isEditMode ? "마일스톤 수정" : "마일스톤 추가"}
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
              마일스톤 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 설계 완료"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="마일스톤에 대한 설명..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 기간 (시작일 ~ 종료일) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                시작일 *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                종료일 *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* 그룹 선택 (부모 행만 표시) */}
          {groupRows.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                배치할 그룹
              </label>
              <select
                value={rowId}
                onChange={(e) => {
                  setRowId(e.target.value);
                  setRowIdChanged(true); // 사용자가 그룹을 변경함
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">미배정</option>
                {groupRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex items-center justify-between pt-2">
            {isEditMode ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
              >
                <Icon name="delete" size="sm" />
                삭제
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
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
                disabled={isLoading || !name.trim() || !startDate || !endDate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? "저장 중..." : isEditMode ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </form>

        {/* 에러 메시지 모달 */}
        {errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            <div className="bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 max-w-xs mx-4">
              <p className="text-slate-900 dark:text-slate-100 text-sm mb-4">
                {errorMessage}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            <div className="bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 max-w-xs mx-4">
              <p className="text-slate-900 dark:text-slate-100 text-sm mb-4">
                마일스톤을 삭제하시겠습니까?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
