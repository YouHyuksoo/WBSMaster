/**
 * @file src/app/dashboard/as-is-analysis/components/ProcessDefinitionTable.tsx
 * @description
 * 업무 프로세스 정의서 테이블 컴포넌트입니다.
 * 프로세스 단계별 정보를 테이블 형태로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **순번**: 프로세스 순서
 * 2. **프로세스명**: 단계명
 * 3. **설명**: 프로세스 설명
 * 4. **입력**: 프로세스 입력 정보
 * 5. **출력**: 프로세스 출력 정보
 * 6. **관련시스템**: 사용 시스템
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsProcessDefinition } from "../hooks/useAsIsProcessDefinition";
import type { AsIsUnitAnalysis, AsIsProcessDefinition } from "../types";

interface ProcessDefinitionTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/**
 * 업무 프로세스 정의서 테이블 컴포넌트
 */
export function ProcessDefinitionTable({ unitAnalysis }: ProcessDefinitionTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AsIsProcessDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AsIsProcessDefinition | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    processName: "",
    description: "",
    input: "",
    output: "",
    relatedSystem: "",
    remarks: "",
  });

  const definitions = unitAnalysis.processDefinitions || [];
  const { create, isCreating, update, isUpdating, delete: deleteItem, isDeleting } =
    useAsIsProcessDefinition(unitAnalysis.id);

  /**
   * 추가 모달 열기
   */
  const handleOpenAddModal = () => {
    setFormData({
      processName: "",
      description: "",
      input: "",
      output: "",
      relatedSystem: "",
      remarks: "",
    });
    setShowAddModal(true);
  };

  /**
   * 수정 모달 열기
   */
  const handleOpenEditModal = (def: AsIsProcessDefinition) => {
    setFormData({
      processName: def.processName,
      description: def.description || "",
      input: def.input || "",
      output: def.output || "",
      relatedSystem: def.relatedSystem || "",
      remarks: def.remarks || "",
    });
    setEditTarget(def);
  };

  /**
   * 추가 저장
   */
  const handleCreate = () => {
    if (!formData.processName.trim()) {
      alert("프로세스명은 필수입니다.");
      return;
    }

    create(
      {
        unitAnalysisId: unitAnalysis.id,
        processName: formData.processName.trim(),
        description: formData.description.trim() || undefined,
        input: formData.input.trim() || undefined,
        output: formData.output.trim() || undefined,
        relatedSystem: formData.relatedSystem.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
        },
      }
    );
  };

  /**
   * 수정 저장
   */
  const handleUpdate = () => {
    if (!editTarget || !formData.processName.trim()) {
      alert("프로세스명은 필수입니다.");
      return;
    }

    update(
      {
        id: editTarget.id,
        data: {
          processName: formData.processName.trim(),
          description: formData.description.trim() || undefined,
          input: formData.input.trim() || undefined,
          output: formData.output.trim() || undefined,
          relatedSystem: formData.relatedSystem.trim() || undefined,
          remarks: formData.remarks.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditTarget(null);
        },
      }
    );
  };

  /**
   * 삭제 확인
   */
  const handleDelete = () => {
    if (!deleteTarget) return;

    deleteItem(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className={`rounded-xl border ${SECTION_STYLES.processDefinition.borderColor} ${SECTION_STYLES.processDefinition.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-green-200 dark:border-green-800">
        <SectionHeader
          style={SECTION_STYLES.processDefinition}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleOpenAddModal}>
              단계 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {definitions.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="format_list_numbered" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 프로세스가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;단계 추가&apos; 버튼을 클릭하여 프로세스를 정의하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-green-100/50 dark:bg-green-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-16">순번</th>
                  <th className="px-4 py-3 text-left">프로세스명</th>
                  <th className="px-4 py-3 text-left">설명</th>
                  <th className="px-4 py-3 text-left w-32">입력</th>
                  <th className="px-4 py-3 text-left w-32">출력</th>
                  <th className="px-4 py-3 text-left w-32">관련시스템</th>
                  <th className="px-4 py-3 text-left w-32">비고</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {definitions.map((def) => (
                  <tr
                    key={def.id}
                    className="border-t border-green-100 dark:border-green-900/50 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                      {def.stepNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-text dark:text-white font-medium">
                      {def.processName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {def.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {def.input || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {def.output || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {def.relatedSystem || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {def.remarks || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(def)}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(def)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <Icon name="delete" size="xs" className="text-text-secondary hover:text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
              <h2 className="text-lg font-bold text-text dark:text-white flex items-center gap-2">
                <Icon name="add_circle" size="sm" className="text-green-500" />
                프로세스 단계 추가
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
              >
                <Icon name="close" size="sm" className="text-text-secondary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
                  프로세스명 <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.processName}
                  onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                  placeholder="예: 입고 검수"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1.5">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="프로세스에 대한 설명을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">입력</label>
                  <Input
                    value={formData.input}
                    onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                    placeholder="예: 입고요청서"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">출력</label>
                  <Input
                    value={formData.output}
                    onChange={(e) => setFormData({ ...formData, output: e.target.value })}
                    placeholder="예: 검수완료"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">관련시스템</label>
                  <Input
                    value={formData.relatedSystem}
                    onChange={(e) => setFormData({ ...formData, relatedSystem: e.target.value })}
                    placeholder="예: ERP, MES"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">비고</label>
                  <Input
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="비고 사항"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border dark:border-border-dark">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                취소
              </Button>
              <Button variant="primary" leftIcon="check" onClick={handleCreate} isLoading={isCreating}>
                추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditTarget(null)} />
          <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark">
              <h2 className="text-lg font-bold text-text dark:text-white flex items-center gap-2">
                <Icon name="edit" size="sm" className="text-primary" />
                프로세스 단계 수정
              </h2>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1 rounded-lg hover:bg-surface dark:hover:bg-background-dark transition-colors"
              >
                <Icon name="close" size="sm" className="text-text-secondary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1.5">
                  프로세스명 <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.processName}
                  onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                  placeholder="예: 입고 검수"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-1.5">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="프로세스에 대한 설명을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">입력</label>
                  <Input
                    value={formData.input}
                    onChange={(e) => setFormData({ ...formData, input: e.target.value })}
                    placeholder="예: 입고요청서"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">출력</label>
                  <Input
                    value={formData.output}
                    onChange={(e) => setFormData({ ...formData, output: e.target.value })}
                    placeholder="예: 검수완료"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">관련시스템</label>
                  <Input
                    value={formData.relatedSystem}
                    onChange={(e) => setFormData({ ...formData, relatedSystem: e.target.value })}
                    placeholder="예: ERP, MES"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1.5">비고</label>
                  <Input
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="비고 사항"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border dark:border-border-dark">
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                취소
              </Button>
              <Button variant="primary" leftIcon="check" onClick={handleUpdate} isLoading={isUpdating}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />
          <div className="relative bg-background-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border dark:border-border-dark">
              <div className="size-10 rounded-full bg-error/10 flex items-center justify-center">
                <Icon name="delete" size="sm" className="text-error" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text dark:text-white">프로세스 삭제</h2>
                <p className="text-sm text-text-secondary">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-text dark:text-white mb-2">다음 프로세스를 삭제하시겠습니까?</p>
              <div className="p-3 bg-surface dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
                <p className="font-medium text-text dark:text-white">
                  {deleteTarget.stepNumber}. {deleteTarget.processName}
                </p>
                {deleteTarget.description && (
                  <p className="text-sm text-text-secondary mt-1">{deleteTarget.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border dark:border-border-dark">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                취소
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Icon name={isDeleting ? "hourglass_empty" : "delete"} size="xs" />
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
