/**
 * @file src/app/dashboard/as-is-analysis/components/CodeDefinitionTable.tsx
 * @description
 * 코드 정의서 테이블 컴포넌트입니다.
 * 시스템에서 사용하는 코드 값들을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **코드 그룹**: 코드 분류 (예: STATUS, TYPE) - 필수
 * 2. **코드 값**: 실제 코드 값 - 필수
 * 3. **코드명**: 사용자에게 표시되는 이름 - 필수
 * 4. **사용 여부**: 활성/비활성 (기본값: 활성)
 * 5. **CRUD**: 추가/수정/삭제 기능 제공
 *
 * @example
 * <CodeDefinitionTable unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsCodeDefinition } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsCodeDefinition } from "../types";

interface CodeDefinitionTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  codeGroup: string;
  codeGroupName: string;
  codeValue: string;
  codeName: string;
  description: string;
  isActive: boolean;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  codeGroup: "",
  codeGroupName: "",
  codeValue: "",
  codeName: "",
  description: "",
  isActive: true,
  remarks: "",
};

/**
 * 코드 정의서 테이블 컴포넌트
 */
export function CodeDefinitionTable({ unitAnalysis }: CodeDefinitionTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsCodeDefinition | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const codeDefinitions = unitAnalysis.codeDefinitions || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsCodeDefinition();

  // 코드 그룹별로 그룹화
  const groupedCodes = codeDefinitions.reduce((acc, code) => {
    const group = code.codeGroup;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(code);
    return acc;
  }, {} as Record<string, typeof codeDefinitions>);

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
  const handleEdit = (item: AsIsCodeDefinition) => {
    setEditingItem(item);
    setFormData({
      codeGroup: item.codeGroup,
      codeGroupName: item.codeGroupName || "",
      codeValue: item.codeValue,
      codeName: item.codeName,
      description: item.description || "",
      isActive: item.isActive,
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
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 저장 (생성/수정)
   */
  const handleSave = () => {
    if (!formData.codeGroup.trim() || !formData.codeValue.trim() || !formData.codeName.trim()) {
      alert("코드 그룹, 코드 값, 코드명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            codeGroup: formData.codeGroup,
            codeGroupName: formData.codeGroupName || undefined,
            codeValue: formData.codeValue,
            codeName: formData.codeName,
            description: formData.description || undefined,
            isActive: formData.isActive,
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
          codeGroup: formData.codeGroup,
          codeGroupName: formData.codeGroupName || undefined,
          codeValue: formData.codeValue,
          codeName: formData.codeName,
          description: formData.description || undefined,
          isActive: formData.isActive,
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
    <div className={`rounded-xl border ${SECTION_STYLES.codeDefinition.borderColor} ${SECTION_STYLES.codeDefinition.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800">
        <SectionHeader
          style={SECTION_STYLES.codeDefinition}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              코드 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {codeDefinitions.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="code" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 코드가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;코드 추가&apos; 버튼을 클릭하여 코드를 등록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-blue-100/50 dark:bg-blue-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-32">코드 그룹</th>
                  <th className="px-4 py-3 text-left">그룹명</th>
                  <th className="px-4 py-3 text-left w-28">코드 값</th>
                  <th className="px-4 py-3 text-left">코드명</th>
                  <th className="px-4 py-3 text-left">설명</th>
                  <th className="px-4 py-3 text-center w-20">사용</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedCodes).map(([group, codes]) => (
                  codes.map((code, index) => (
                    <tr
                      key={code.id}
                      className="border-t border-blue-100 dark:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      {index === 0 && (
                        <>
                          <td
                            rowSpan={codes.length}
                            className="px-4 py-3 text-sm font-mono font-medium text-text dark:text-white bg-blue-50/50 dark:bg-blue-900/20 border-r border-blue-100 dark:border-blue-900/50"
                          >
                            {code.codeGroup}
                          </td>
                          <td
                            rowSpan={codes.length}
                            className="px-4 py-3 text-sm text-text-secondary bg-blue-50/50 dark:bg-blue-900/20 border-r border-blue-100 dark:border-blue-900/50"
                          >
                            {code.codeGroupName || "-"}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm font-mono text-text dark:text-white">
                        {code.codeValue}
                      </td>
                      <td className="px-4 py-3 text-sm text-text dark:text-white">
                        {code.codeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {code.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {code.isActive ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            사용
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            미사용
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deleteConfirmId === code.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDelete(code.id)}
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
                              onClick={() => handleEdit(code)}
                              disabled={isPending}
                              className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                            >
                              <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(code.id)}
                              disabled={isPending}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              <Icon name="delete" size="xs" className="text-text-secondary hover:text-error" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
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
                  {editingItem ? "코드 수정" : "코드 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                {/* 코드 그룹 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      코드 그룹 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.codeGroup}
                      onChange={(e) => handleInputChange("codeGroup", e.target.value)}
                      placeholder="예: STATUS"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      그룹명
                    </label>
                    <Input
                      value={formData.codeGroupName}
                      onChange={(e) => handleInputChange("codeGroupName", e.target.value)}
                      placeholder="예: 상태코드"
                    />
                  </div>
                </div>

                {/* 코드 값/명 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      코드 값 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.codeValue}
                      onChange={(e) => handleInputChange("codeValue", e.target.value)}
                      placeholder="예: ACTIVE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      코드명 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.codeName}
                      onChange={(e) => handleInputChange("codeName", e.target.value)}
                      placeholder="예: 활성"
                    />
                  </div>
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="코드에 대한 설명을 입력하세요"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* 사용 여부 체크박스 */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange("isActive", e.target.checked)}
                    className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text dark:text-white">사용 여부</span>
                </label>

                {/* 비고 */}
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
