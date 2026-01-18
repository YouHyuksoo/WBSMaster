/**
 * @file src/app/dashboard/as-is-analysis/components/ScreenTable.tsx
 * @description
 * 화면 목록 테이블 컴포넌트입니다.
 * 시스템 방식의 업무에서 사용되는 화면들을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **화면 ID**: 시스템 내 화면 식별자
 * 2. **화면명**: 화면 이름 (필수)
 * 3. **메뉴 경로**: 화면 접근 경로
 * 4. **화면 유형**: 조회, 등록, 수정 등
 *
 * CRUD 기능:
 * - useAsIsScreen 훅을 사용하여 API 연동
 * - 모달을 통한 추가/수정
 * - 2단계 삭제 확인 UI
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsScreen } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsScreen } from "../types";

interface ScreenTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  screenId: string;
  screenName: string;
  description: string;
  menuPath: string;
  screenType: string;
  relatedFunction: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  screenId: "",
  screenName: "",
  description: "",
  menuPath: "",
  screenType: "",
  relatedFunction: "",
  remarks: "",
};

/**
 * 화면 목록 테이블 컴포넌트
 */
export function ScreenTable({ unitAnalysis }: ScreenTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsScreen | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const screens = unitAnalysis.screens || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsScreen();

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
  const handleEdit = (item: AsIsScreen) => {
    setEditingItem(item);
    setFormData({
      screenId: item.screenId || "",
      screenName: item.screenName,
      description: item.description || "",
      menuPath: item.menuPath || "",
      screenType: item.screenType || "",
      relatedFunction: item.relatedFunction || "",
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
    if (!formData.screenName.trim()) {
      alert("화면명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            screenId: formData.screenId || undefined,
            screenName: formData.screenName,
            description: formData.description || undefined,
            menuPath: formData.menuPath || undefined,
            screenType: formData.screenType || undefined,
            relatedFunction: formData.relatedFunction || undefined,
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
          screenId: formData.screenId || undefined,
          screenName: formData.screenName,
          description: formData.description || undefined,
          menuPath: formData.menuPath || undefined,
          screenType: formData.screenType || undefined,
          relatedFunction: formData.relatedFunction || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.screen.borderColor} ${SECTION_STYLES.screen.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800">
        <SectionHeader
          style={SECTION_STYLES.screen}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              화면 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {screens.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="desktop_windows" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 화면이 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;화면 추가&apos; 버튼을 클릭하여 화면을 등록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-blue-100/50 dark:bg-blue-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-28">화면 ID</th>
                  <th className="px-4 py-3 text-left">화면명</th>
                  <th className="px-4 py-3 text-left">설명</th>
                  <th className="px-4 py-3 text-left">메뉴 경로</th>
                  <th className="px-4 py-3 text-left w-24">유형</th>
                  <th className="px-4 py-3 text-left">관련 기능</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {screens.map((screen) => (
                  <tr
                    key={screen.id}
                    className="border-t border-blue-100 dark:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-text-secondary">
                      {screen.screenId || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                      {screen.screenName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {screen.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {screen.menuPath || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {screen.screenType ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                          {screen.screenType}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {screen.relatedFunction || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === screen.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(screen.id)}
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
                            onClick={() => handleEdit(screen)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(screen.id)}
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
                  {editingItem ? "화면 수정" : "화면 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    화면 ID
                  </label>
                  <Input
                    value={formData.screenId}
                    onChange={(e) => handleInputChange("screenId", e.target.value)}
                    placeholder="예: SCR001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    화면명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.screenName}
                    onChange={(e) => handleInputChange("screenName", e.target.value)}
                    placeholder="예: 자재입고등록 화면"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="화면에 대한 상세 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    메뉴 경로
                  </label>
                  <Input
                    value={formData.menuPath}
                    onChange={(e) => handleInputChange("menuPath", e.target.value)}
                    placeholder="예: 자재관리 > 입고관리 > 입고등록"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      화면 유형
                    </label>
                    <select
                      value={formData.screenType}
                      onChange={(e) => handleInputChange("screenType", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">선택</option>
                      <option value="조회">조회</option>
                      <option value="등록">등록</option>
                      <option value="수정">수정</option>
                      <option value="삭제">삭제</option>
                      <option value="팝업">팝업</option>
                      <option value="리포트">리포트</option>
                      <option value="대시보드">대시보드</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      관련 기능
                    </label>
                    <Input
                      value={formData.relatedFunction}
                      onChange={(e) => handleInputChange("relatedFunction", e.target.value)}
                      placeholder="예: 자재입고등록"
                    />
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
