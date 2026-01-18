/**
 * @file src/app/dashboard/as-is-analysis/components/ResponsibilityTable.tsx
 * @description
 * R&R(역할과 책임) 정의 테이블 컴포넌트입니다.
 * 담당자별 역할과 책임을 테이블 형태로 표시하며 CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **역할/담당자**: 담당자 이름 또는 역할
 * 2. **부서**: 소속 부서
 * 3. **책임/업무**: 담당 업무 내용
 * 4. **권한**: 의사결정 권한
 *
 * @example
 * <ResponsibilityTable unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsResponsibility } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsResponsibility } from "../types";

interface ResponsibilityTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  role: string;
  department: string;
  responsibility: string;
  authority: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  role: "",
  department: "",
  responsibility: "",
  authority: "",
  remarks: "",
};

/**
 * R&R 정의 테이블 컴포넌트
 */
export function ResponsibilityTable({ unitAnalysis }: ResponsibilityTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsResponsibility | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const responsibilities = unitAnalysis.responsibilities || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsResponsibility();

  /**
   * 모달 열기 (추가)
   */
  const handleAdd = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  /**
   * 모달 열기 (수정)
   */
  const handleEdit = (item: AsIsResponsibility) => {
    setEditingItem(item);
    setFormData({
      role: item.role,
      department: item.department || "",
      responsibility: item.responsibility,
      authority: item.authority || "",
      remarks: item.remarks || "",
    });
    setShowModal(true);
  };

  /**
   * 모달 닫기
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialFormData);
  };

  /**
   * 폼 입력 핸들러
   */
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 저장 (생성/수정)
   */
  const handleSave = () => {
    if (!formData.role.trim() || !formData.responsibility.trim()) {
      alert("역할과 책임은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            role: formData.role,
            department: formData.department || undefined,
            responsibility: formData.responsibility,
            authority: formData.authority || undefined,
            remarks: formData.remarks || undefined,
          },
        },
        {
          onSuccess: () => handleCloseModal(),
        }
      );
    } else {
      // 생성
      create(
        {
          unitAnalysisId: unitAnalysis.id,
          role: formData.role,
          department: formData.department || undefined,
          responsibility: formData.responsibility,
          authority: formData.authority || undefined,
          remarks: formData.remarks || undefined,
        },
        {
          onSuccess: () => handleCloseModal(),
        }
      );
    }
  };

  /**
   * 삭제 확인
   */
  const handleDelete = (id: string) => {
    remove(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const isPending = isCreating || isUpdating || isDeleting;

  return (
    <div className={`rounded-xl border ${SECTION_STYLES.responsibility.borderColor} ${SECTION_STYLES.responsibility.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-purple-200 dark:border-purple-800">
        <SectionHeader
          style={SECTION_STYLES.responsibility}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              역할 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {responsibilities.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="group" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 R&R이 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;역할 추가&apos; 버튼을 클릭하여 역할과 책임을 정의하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-purple-100/50 dark:bg-purple-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-32">역할/담당자</th>
                  <th className="px-4 py-3 text-left w-28">부서</th>
                  <th className="px-4 py-3 text-left">책임/업무</th>
                  <th className="px-4 py-3 text-left w-40">권한</th>
                  <th className="px-4 py-3 text-left w-32">비고</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {responsibilities.map((resp) => (
                  <tr
                    key={resp.id}
                    className="border-t border-purple-100 dark:border-purple-900/50 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                      {resp.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {resp.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text dark:text-white">
                      {resp.responsibility}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {resp.authority || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {resp.remarks || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === resp.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(resp.id)}
                            disabled={isDeleting}
                            className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <Icon name="check" size="xs" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 rounded bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Icon name="close" size="xs" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(resp)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(resp.id)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="delete" size="xs" className="text-text-secondary hover:text-error" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
                <h3 className="text-lg font-bold text-text dark:text-white">
                  {editingItem ? "R&R 수정" : "R&R 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    역할/담당자 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    placeholder="예: 생산관리 담당자"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    부서
                  </label>
                  <Input
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    placeholder="예: 생산관리팀"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    책임/업무 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.responsibility}
                    onChange={(e) => handleInputChange("responsibility", e.target.value)}
                    placeholder="담당 업무 내용을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    권한
                  </label>
                  <Input
                    value={formData.authority}
                    onChange={(e) => handleInputChange("authority", e.target.value)}
                    placeholder="예: 생산계획 승인"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    비고
                  </label>
                  <Input
                    value={formData.remarks}
                    onChange={(e) => handleInputChange("remarks", e.target.value)}
                    placeholder="추가 메모"
                  />
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border dark:border-border-dark">
                <Button variant="outline" onClick={handleCloseModal} disabled={isPending}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isCreating || isUpdating}
                  disabled={isPending}
                >
                  {editingItem ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
