/**
 * @file src/app/dashboard/as-is-analysis/components/FunctionTable.tsx
 * @description
 * 기능 목록 테이블 컴포넌트입니다.
 * 시스템 방식의 업무에서 사용되는 기능들을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **기능 ID**: 시스템 내 기능 식별자
 * 2. **기능명**: 기능 이름 (필수)
 * 3. **모듈**: 소속 모듈
 * 4. **중요도**: 기능의 업무 중요도 (HIGH/MEDIUM/LOW)
 *
 * CRUD 기능:
 * - useAsIsFunction 훅을 사용하여 API 연동
 * - 모달을 통한 추가/수정
 * - 2단계 삭제 확인 UI
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES, PRIORITIES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsFunction } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsFunction, Priority } from "../types";

interface FunctionTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  functionId: string;
  functionName: string;
  description: string;
  module: string;
  usageFrequency: string;
  userCount: string;
  importance: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  functionId: "",
  functionName: "",
  description: "",
  module: "",
  usageFrequency: "",
  userCount: "",
  importance: "",
  remarks: "",
};

/**
 * 기능 목록 테이블 컴포넌트
 */
export function FunctionTable({ unitAnalysis }: FunctionTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsFunction | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const functions = unitAnalysis.functions || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsFunction();

  /**
   * 중요도 설정 가져오기
   */
  const getPriorityConfig = (priority: string | null | undefined) => {
    if (!priority) return null;
    return PRIORITIES[priority as Priority];
  };

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
  const handleEdit = (item: AsIsFunction) => {
    setEditingItem(item);
    setFormData({
      functionId: item.functionId || "",
      functionName: item.functionName,
      description: item.description || "",
      module: item.module || "",
      usageFrequency: item.usageFrequency || "",
      userCount: item.userCount || "",
      importance: item.importance || "",
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
    if (!formData.functionName.trim()) {
      alert("기능명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            functionId: formData.functionId || undefined,
            functionName: formData.functionName,
            description: formData.description || undefined,
            module: formData.module || undefined,
            usageFrequency: formData.usageFrequency || undefined,
            userCount: formData.userCount || undefined,
            importance: formData.importance || undefined,
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
          functionId: formData.functionId || undefined,
          functionName: formData.functionName,
          description: formData.description || undefined,
          module: formData.module || undefined,
          usageFrequency: formData.usageFrequency || undefined,
          userCount: formData.userCount || undefined,
          importance: formData.importance || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.function.borderColor} ${SECTION_STYLES.function.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800">
        <SectionHeader
          style={SECTION_STYLES.function}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              기능 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {functions.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="functions" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 기능이 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;기능 추가&apos; 버튼을 클릭하여 기능을 등록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-blue-100/50 dark:bg-blue-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-28">기능 ID</th>
                  <th className="px-4 py-3 text-left">기능명</th>
                  <th className="px-4 py-3 text-left">설명</th>
                  <th className="px-4 py-3 text-left w-24">모듈</th>
                  <th className="px-4 py-3 text-left w-24">사용빈도</th>
                  <th className="px-4 py-3 text-left w-24">중요도</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {functions.map((func) => {
                  const priorityConfig = getPriorityConfig(func.importance);
                  return (
                    <tr
                      key={func.id}
                      className="border-t border-blue-100 dark:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-text-secondary">
                        {func.functionId || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                        {func.functionName}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {func.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {func.module || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {func.usageFrequency || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {priorityConfig ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        ) : (
                          <span className="text-sm text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deleteConfirmId === func.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDelete(func.id)}
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
                              onClick={() => handleEdit(func)}
                              disabled={isPending}
                              className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                            >
                              <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(func.id)}
                              disabled={isPending}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              <Icon name="delete" size="xs" className="text-text-secondary hover:text-error" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                  {editingItem ? "기능 수정" : "기능 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    기능 ID
                  </label>
                  <Input
                    value={formData.functionId}
                    onChange={(e) => handleInputChange("functionId", e.target.value)}
                    placeholder="예: FUNC001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    기능명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.functionName}
                    onChange={(e) => handleInputChange("functionName", e.target.value)}
                    placeholder="예: 자재입고등록"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="기능에 대한 상세 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      모듈
                    </label>
                    <Input
                      value={formData.module}
                      onChange={(e) => handleInputChange("module", e.target.value)}
                      placeholder="예: 자재관리"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      사용빈도
                    </label>
                    <Input
                      value={formData.usageFrequency}
                      onChange={(e) => handleInputChange("usageFrequency", e.target.value)}
                      placeholder="예: 일 100회"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      사용자 수
                    </label>
                    <Input
                      value={formData.userCount}
                      onChange={(e) => handleInputChange("userCount", e.target.value)}
                      placeholder="예: 10명"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      중요도
                    </label>
                    <select
                      value={formData.importance}
                      onChange={(e) => handleInputChange("importance", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">선택</option>
                      <option value="HIGH">상</option>
                      <option value="MEDIUM">중</option>
                      <option value="LOW">하</option>
                    </select>
                  </div>
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
