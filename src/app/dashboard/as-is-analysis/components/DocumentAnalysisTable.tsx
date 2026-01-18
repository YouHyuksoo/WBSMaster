/**
 * @file src/app/dashboard/as-is-analysis/components/DocumentAnalysisTable.tsx
 * @description
 * 문서 구조 분석 테이블 컴포넌트입니다.
 * 문서의 필드별 구조를 분석하여 표시하며 CRUD 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **문서명**: 분석 대상 문서 (필수)
 * 2. **필드명**: 문서 내 필드/항목 (필수)
 * 3. **데이터 타입**: 텍스트, 숫자, 날짜 등
 * 4. **샘플 데이터**: 실제 데이터 예시
 * 5. **필수 여부**: 해당 필드의 필수 입력 여부 (체크박스)
 * 6. **검증 규칙**: 데이터 유효성 검증 규칙
 *
 * @example
 * <DocumentAnalysisTable unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsDocumentAnalysis } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsDocumentAnalysis } from "../types";

interface DocumentAnalysisTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  documentName: string;
  fieldName: string;
  dataType: string;
  sampleData: string;
  isMandatory: boolean;
  validationRule: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  documentName: "",
  fieldName: "",
  dataType: "",
  sampleData: "",
  isMandatory: false,
  validationRule: "",
  remarks: "",
};

/**
 * 문서 구조 분석 테이블 컴포넌트
 */
export function DocumentAnalysisTable({ unitAnalysis }: DocumentAnalysisTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsDocumentAnalysis | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const analyses = unitAnalysis.documentAnalyses || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsDocumentAnalysis();

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
  const handleEdit = (item: AsIsDocumentAnalysis) => {
    setEditingItem(item);
    setFormData({
      documentName: item.documentName,
      fieldName: item.fieldName,
      dataType: item.dataType || "",
      sampleData: item.sampleData || "",
      isMandatory: item.isMandatory || false,
      validationRule: item.validationRule || "",
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
   * 폼 입력 핸들러 (텍스트)
   */
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 저장 (생성/수정)
   */
  const handleSave = () => {
    if (!formData.documentName.trim() || !formData.fieldName.trim()) {
      alert("문서명과 필드명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            documentName: formData.documentName,
            fieldName: formData.fieldName,
            dataType: formData.dataType || undefined,
            sampleData: formData.sampleData || undefined,
            isMandatory: formData.isMandatory,
            validationRule: formData.validationRule || undefined,
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
          fieldName: formData.fieldName,
          dataType: formData.dataType || undefined,
          sampleData: formData.sampleData || undefined,
          isMandatory: formData.isMandatory,
          validationRule: formData.validationRule || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.documentAnalysis.borderColor} ${SECTION_STYLES.documentAnalysis.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-teal-200 dark:border-teal-800">
        <SectionHeader
          style={SECTION_STYLES.documentAnalysis}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              필드 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {analyses.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="article" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 분석 데이터가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;필드 추가&apos; 버튼을 클릭하여 문서 구조를 분석하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-teal-100/50 dark:bg-teal-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left">문서명</th>
                  <th className="px-4 py-3 text-left">필드명</th>
                  <th className="px-4 py-3 text-left w-24">데이터 타입</th>
                  <th className="px-4 py-3 text-left">샘플 데이터</th>
                  <th className="px-4 py-3 text-center w-20">필수</th>
                  <th className="px-4 py-3 text-left">검증 규칙</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr
                    key={analysis.id}
                    className="border-t border-teal-100 dark:border-teal-900/50 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                      {analysis.documentName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text dark:text-white">
                      {analysis.fieldName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                        {analysis.dataType || "텍스트"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {analysis.sampleData || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {analysis.isMandatory ? (
                        <Icon name="check_circle" size="xs" className="text-success" />
                      ) : (
                        <Icon name="remove" size="xs" className="text-text-secondary" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {analysis.validationRule || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === analysis.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(analysis.id)}
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
                            onClick={() => handleEdit(analysis)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(analysis.id)}
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
                  {editingItem ? "필드 수정" : "필드 추가"}
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
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    필드명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.fieldName}
                    onChange={(e) => handleInputChange("fieldName", e.target.value)}
                    placeholder="예: 생산수량"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      데이터 타입
                    </label>
                    <select
                      value={formData.dataType}
                      onChange={(e) => handleInputChange("dataType", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">선택하세요</option>
                      <option value="텍스트">텍스트</option>
                      <option value="숫자">숫자</option>
                      <option value="날짜">날짜</option>
                      <option value="날짜시간">날짜시간</option>
                      <option value="불리언">불리언</option>
                      <option value="코드">코드</option>
                      <option value="목록">목록</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isMandatory}
                        onChange={(e) => handleInputChange("isMandatory", e.target.checked)}
                        className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-text dark:text-white">필수 입력</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    샘플 데이터
                  </label>
                  <Input
                    value={formData.sampleData}
                    onChange={(e) => handleInputChange("sampleData", e.target.value)}
                    placeholder="예: 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    검증 규칙
                  </label>
                  <Input
                    value={formData.validationRule}
                    onChange={(e) => handleInputChange("validationRule", e.target.value)}
                    placeholder="예: 숫자만 입력, 최대 6자리"
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
