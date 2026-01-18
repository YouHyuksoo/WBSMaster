/**
 * @file src/app/dashboard/as-is-analysis/components/DocumentTable.tsx
 * @description
 * 문서 목록 테이블 컴포넌트입니다.
 * 수기/엑셀 방식의 업무에서 사용되는 문서들을 관리합니다.
 * CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **문서명**: 문서/양식 이름 (필수)
 * 2. **문서 유형**: 보고서, 양식, 대장 등
 * 3. **작성 목적**: 문서의 사용 목적
 * 4. **작성자**: 문서 작성 담당자
 * 5. **주기**: 작성 주기 (일별, 주별 등)
 * 6. **보관 위치**: 문서 저장 위치
 * 7. **보관 기간**: 문서 보관 기간
 *
 * @example
 * <DocumentTable unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsDocument } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsDocument } from "../types";

interface DocumentTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  documentName: string;
  documentType: string;
  purpose: string;
  creator: string;
  frequency: string;
  storageLocation: string;
  retentionPeriod: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  documentName: "",
  documentType: "",
  purpose: "",
  creator: "",
  frequency: "",
  storageLocation: "",
  retentionPeriod: "",
  remarks: "",
};

/**
 * 문서 목록 테이블 컴포넌트
 */
export function DocumentTable({ unitAnalysis }: DocumentTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsDocument | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const documents = unitAnalysis.documents || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsDocument();

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
  const handleEdit = (item: AsIsDocument) => {
    setEditingItem(item);
    setFormData({
      documentName: item.documentName,
      documentType: item.documentType || "",
      purpose: item.purpose || "",
      creator: item.creator || "",
      frequency: item.frequency || "",
      storageLocation: item.storageLocation || "",
      retentionPeriod: item.retentionPeriod || "",
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
    if (!formData.documentName.trim()) {
      alert("문서명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            documentName: formData.documentName,
            documentType: formData.documentType || undefined,
            purpose: formData.purpose || undefined,
            creator: formData.creator || undefined,
            frequency: formData.frequency || undefined,
            storageLocation: formData.storageLocation || undefined,
            retentionPeriod: formData.retentionPeriod || undefined,
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
          documentName: formData.documentName,
          documentType: formData.documentType || undefined,
          purpose: formData.purpose || undefined,
          creator: formData.creator || undefined,
          frequency: formData.frequency || undefined,
          storageLocation: formData.storageLocation || undefined,
          retentionPeriod: formData.retentionPeriod || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.document.borderColor} ${SECTION_STYLES.document.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-teal-200 dark:border-teal-800">
        <SectionHeader
          style={SECTION_STYLES.document}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              문서 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {documents.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="folder" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 문서가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;문서 추가&apos; 버튼을 클릭하여 문서를 등록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-teal-100/50 dark:bg-teal-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left">문서명</th>
                  <th className="px-4 py-3 text-left w-24">유형</th>
                  <th className="px-4 py-3 text-left">작성 목적</th>
                  <th className="px-4 py-3 text-left w-24">작성자</th>
                  <th className="px-4 py-3 text-left w-24">주기</th>
                  <th className="px-4 py-3 text-left">보관 위치</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-teal-100 dark:border-teal-900/50 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                      {doc.documentName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.documentType || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.purpose || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.creator || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.frequency || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.storageLocation || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === doc.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(doc.id)}
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
                            onClick={() => handleEdit(doc)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(doc.id)}
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
                  {editingItem ? "문서 수정" : "문서 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    문서명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.documentName}
                    onChange={(e) => handleInputChange("documentName", e.target.value)}
                    placeholder="예: 생산일보"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      문서 유형
                    </label>
                    <Input
                      value={formData.documentType}
                      onChange={(e) => handleInputChange("documentType", e.target.value)}
                      placeholder="예: 보고서, 양식, 대장"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      작성자
                    </label>
                    <Input
                      value={formData.creator}
                      onChange={(e) => handleInputChange("creator", e.target.value)}
                      placeholder="예: 생산팀"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    작성 목적
                  </label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => handleInputChange("purpose", e.target.value)}
                    placeholder="문서의 작성 목적을 입력하세요"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      작성 주기
                    </label>
                    <Input
                      value={formData.frequency}
                      onChange={(e) => handleInputChange("frequency", e.target.value)}
                      placeholder="예: 일별, 주별, 월별"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      보관 기간
                    </label>
                    <Input
                      value={formData.retentionPeriod}
                      onChange={(e) => handleInputChange("retentionPeriod", e.target.value)}
                      placeholder="예: 1년, 5년, 영구"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    보관 위치
                  </label>
                  <Input
                    value={formData.storageLocation}
                    onChange={(e) => handleInputChange("storageLocation", e.target.value)}
                    placeholder="예: 공유드라이브, 문서보관함"
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
