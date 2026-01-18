/**
 * @file src/app/dashboard/as-is-analysis/components/DataModelTable.tsx
 * @description
 * 데이터 모델 테이블 컴포넌트입니다.
 * 시스템의 테이블/컬럼 구조를 관리합니다.
 *
 * 초보자 가이드:
 * 1. **테이블명**: DB 테이블명 (필수)
 * 2. **컬럼명**: 테이블 내 컬럼
 * 3. **데이터 타입**: VARCHAR, INT 등
 * 4. **PK/FK**: 키 여부
 * 5. **CRUD**: 추가/수정/삭제 기능 제공
 *
 * @example
 * <DataModelTable unitAnalysis={unitAnalysis} />
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsDataModel } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsDataModel } from "../types";

interface DataModelTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  tableName: string;
  tableNameKr: string;
  description: string;
  columnName: string;
  columnNameKr: string;
  dataType: string;
  length: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  defaultValue: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  tableName: "",
  tableNameKr: "",
  description: "",
  columnName: "",
  columnNameKr: "",
  dataType: "",
  length: "",
  isPrimaryKey: false,
  isForeignKey: false,
  isNullable: true,
  defaultValue: "",
  remarks: "",
};

/**
 * 데이터 모델 테이블 컴포넌트
 */
export function DataModelTable({ unitAnalysis }: DataModelTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsDataModel | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const dataModels = unitAnalysis.dataModels || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsDataModel();

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
  const handleEdit = (item: AsIsDataModel) => {
    setEditingItem(item);
    setFormData({
      tableName: item.tableName,
      tableNameKr: item.tableNameKr || "",
      description: item.description || "",
      columnName: item.columnName || "",
      columnNameKr: item.columnNameKr || "",
      dataType: item.dataType || "",
      length: item.length || "",
      isPrimaryKey: item.isPrimaryKey,
      isForeignKey: item.isForeignKey,
      isNullable: item.isNullable,
      defaultValue: item.defaultValue || "",
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
   * 폼 입력 핸들러 (문자열)
   */
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 저장 (생성/수정)
   */
  const handleSave = () => {
    if (!formData.tableName.trim()) {
      alert("테이블명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            tableName: formData.tableName,
            tableNameKr: formData.tableNameKr || undefined,
            description: formData.description || undefined,
            columnName: formData.columnName || undefined,
            columnNameKr: formData.columnNameKr || undefined,
            dataType: formData.dataType || undefined,
            length: formData.length || undefined,
            isPrimaryKey: formData.isPrimaryKey,
            isForeignKey: formData.isForeignKey,
            isNullable: formData.isNullable,
            defaultValue: formData.defaultValue || undefined,
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
          tableName: formData.tableName,
          tableNameKr: formData.tableNameKr || undefined,
          description: formData.description || undefined,
          columnName: formData.columnName || undefined,
          columnNameKr: formData.columnNameKr || undefined,
          dataType: formData.dataType || undefined,
          length: formData.length || undefined,
          isPrimaryKey: formData.isPrimaryKey,
          isForeignKey: formData.isForeignKey,
          isNullable: formData.isNullable,
          defaultValue: formData.defaultValue || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.dataModel.borderColor} ${SECTION_STYLES.dataModel.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800">
        <SectionHeader
          style={SECTION_STYLES.dataModel}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              컬럼 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {dataModels.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="storage" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 데이터 모델이 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;컬럼 추가&apos; 버튼을 클릭하여 테이블 구조를 등록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-blue-100/50 dark:bg-blue-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left">테이블명</th>
                  <th className="px-4 py-3 text-left">테이블명(한글)</th>
                  <th className="px-4 py-3 text-left">컬럼명</th>
                  <th className="px-4 py-3 text-left">컬럼명(한글)</th>
                  <th className="px-4 py-3 text-left w-24">타입</th>
                  <th className="px-4 py-3 text-center w-12">PK</th>
                  <th className="px-4 py-3 text-center w-12">FK</th>
                  <th className="px-4 py-3 text-center w-12">NULL</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {dataModels.map((model) => (
                  <tr
                    key={model.id}
                    className="border-t border-blue-100 dark:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-text dark:text-white">
                      {model.tableName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {model.tableNameKr || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-text dark:text-white">
                      {model.columnName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {model.columnNameKr || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-text-secondary">
                      {model.dataType || "-"}
                      {model.length && `(${model.length})`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {model.isPrimaryKey && (
                        <Icon name="key" size="xs" className="text-amber-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {model.isForeignKey && (
                        <Icon name="link" size="xs" className="text-blue-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {model.isNullable ? (
                        <Icon name="check" size="xs" className="text-success" />
                      ) : (
                        <Icon name="close" size="xs" className="text-error" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === model.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(model.id)}
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
                            onClick={() => handleEdit(model)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(model.id)}
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
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
                <h3 className="text-lg font-bold text-text dark:text-white">
                  {editingItem ? "데이터 모델 수정" : "데이터 모델 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                {/* 테이블 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      테이블명 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.tableName}
                      onChange={(e) => handleInputChange("tableName", e.target.value)}
                      placeholder="예: TB_ORDER"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      테이블명(한글)
                    </label>
                    <Input
                      value={formData.tableNameKr}
                      onChange={(e) => handleInputChange("tableNameKr", e.target.value)}
                      placeholder="예: 주문 테이블"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    설명
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="테이블 설명"
                  />
                </div>

                {/* 컬럼 정보 */}
                <div className="border-t border-border dark:border-border-dark pt-4">
                  <h4 className="text-sm font-semibold text-text dark:text-white mb-3">컬럼 정보</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-white mb-1">
                        컬럼명
                      </label>
                      <Input
                        value={formData.columnName}
                        onChange={(e) => handleInputChange("columnName", e.target.value)}
                        placeholder="예: ORDER_ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-white mb-1">
                        컬럼명(한글)
                      </label>
                      <Input
                        value={formData.columnNameKr}
                        onChange={(e) => handleInputChange("columnNameKr", e.target.value)}
                        placeholder="예: 주문ID"
                      />
                    </div>
                  </div>
                </div>

                {/* 데이터 타입 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      데이터 타입
                    </label>
                    <Input
                      value={formData.dataType}
                      onChange={(e) => handleInputChange("dataType", e.target.value)}
                      placeholder="예: VARCHAR"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      길이
                    </label>
                    <Input
                      value={formData.length}
                      onChange={(e) => handleInputChange("length", e.target.value)}
                      placeholder="예: 50"
                    />
                  </div>
                </div>

                {/* 키/NULL 체크박스 */}
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPrimaryKey}
                      onChange={(e) => handleInputChange("isPrimaryKey", e.target.checked)}
                      className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text dark:text-white">Primary Key</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isForeignKey}
                      onChange={(e) => handleInputChange("isForeignKey", e.target.checked)}
                      className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text dark:text-white">Foreign Key</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isNullable}
                      onChange={(e) => handleInputChange("isNullable", e.target.checked)}
                      className="w-4 h-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text dark:text-white">Nullable</span>
                  </label>
                </div>

                {/* 기본값, 비고 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      기본값
                    </label>
                    <Input
                      value={formData.defaultValue}
                      onChange={(e) => handleInputChange("defaultValue", e.target.value)}
                      placeholder="예: NULL"
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
