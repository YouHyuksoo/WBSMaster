/**
 * @file src/app/dashboard/customer-requirements/components/CustomerRequirementTable.tsx
 * @description
 * 고객요구사항 테이블 컴포넌트입니다.
 * 고객요구사항 목록을 테이블 형태로 표시하고 수정/삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 순번, 관리번호, 사업부, 업무구분, 기능명, 요구사항, 요청일, 요청자, 적용방안, 적용여부, To-Be, 액션
 * 2. **적용여부 배지**: 상태에 따른 색상 배지 표시
 * 3. **액션 버튼**: 수정, 삭제 기능
 */

"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui";
import {
  type CustomerRequirement,
  APPLY_STATUS_LABELS,
  APPLY_STATUS_COLORS,
} from "../types";

interface CustomerRequirementTableProps {
  requirements: CustomerRequirement[];
  isLoading: boolean;
  onEdit: (requirement: CustomerRequirement) => void;
  onDelete: (id: string) => void;
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 고객요구사항 테이블 컴포넌트
 */
export function CustomerRequirementTable({
  requirements,
  isLoading,
  onEdit,
  onDelete,
}: CustomerRequirementTableProps) {
  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<CustomerRequirement | null>(null);

  // 컬럼 정의
  const columns = useMemo(
    () => [
      { key: "sequence", label: "순번", width: "60px" },
      { key: "code", label: "관리번호", width: "120px" },
      { key: "businessUnit", label: "사업부", width: "80px" },
      { key: "category", label: "업무구분", width: "100px" },
      { key: "functionName", label: "기능명", width: "150px" },
      { key: "content", label: "요구사항", width: "1fr" },
      { key: "requestDate", label: "요청일", width: "100px" },
      { key: "requester", label: "요청자", width: "80px" },
      { key: "solution", label: "적용방안", width: "200px" },
      { key: "applyStatus", label: "적용여부", width: "80px" },
      { key: "toBeCode", label: "To-Be", width: "120px" },
      { key: "actions", label: "", width: "80px" },
    ],
    []
  );

  // 삭제 처리
  const handleDeleteClick = (req: CustomerRequirement) => {
    setDeletingRequirement(req);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deletingRequirement) {
      onDelete(deletingRequirement.id);
      setShowDeleteConfirm(false);
      setDeletingRequirement(null);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-500 dark:text-slate-400">
          데이터를 불러오는 중...
        </span>
      </div>
    );
  }

  // 데이터 없음
  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">
          등록된 고객요구사항이 없습니다.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          새 고객요구사항을 등록하거나 엑셀 파일을 업로드하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* 헤더 */}
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* 바디 */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {requirements.map((req) => (
              <tr
                key={req.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {/* 순번 */}
                <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">
                  {req.sequence}
                </td>

                {/* 관리번호 */}
                <td className="px-3 py-3 font-mono text-blue-600 dark:text-blue-400">
                  {req.code}
                </td>

                {/* 사업부 */}
                <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                  {req.businessUnit}
                </td>

                {/* 업무구분 */}
                <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                  {req.category || "-"}
                </td>

                {/* 기능명 */}
                <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium">
                  {req.functionName}
                </td>

                {/* 요구사항 */}
                <td
                  className="px-3 py-3 text-slate-700 dark:text-slate-300 max-w-md truncate"
                  title={req.content}
                >
                  {req.content}
                </td>

                {/* 요청일 */}
                <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDate(req.requestDate)}
                </td>

                {/* 요청자 */}
                <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                  {req.requester || "-"}
                </td>

                {/* 적용방안 */}
                <td
                  className="px-3 py-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate"
                  title={req.solution || ""}
                >
                  {req.solution || "-"}
                </td>

                {/* 적용여부 */}
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      APPLY_STATUS_COLORS[req.applyStatus]
                    }`}
                  >
                    {APPLY_STATUS_LABELS[req.applyStatus]}
                  </span>
                </td>

                {/* To-Be */}
                <td className="px-3 py-3 font-mono text-slate-500 dark:text-slate-400">
                  {req.toBeCode || "-"}
                </td>

                {/* 액션 */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(req)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      title="수정"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(req)}
                      className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 푸터 - 총 개수 */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          총 <span className="font-medium text-slate-700 dark:text-slate-200">{requirements.length}</span>건
        </p>
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="고객요구사항 삭제"
        message={`관리번호 "${deletingRequirement?.code}" 항목을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingRequirement(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
