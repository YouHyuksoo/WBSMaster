/**
 * @file src/app/dashboard/as-is-analysis/components/InterfaceTable.tsx
 * @description
 * 인터페이스 목록 테이블 컴포넌트입니다.
 * 시스템 간 인터페이스 정보를 관리합니다.
 *
 * 초보자 가이드:
 * 1. **인터페이스 ID**: 인터페이스 식별자
 * 2. **인터페이스명**: 인터페이스 이름 (필수)
 * 3. **송신/수신 시스템**: 데이터 흐름
 * 4. **프로토콜**: API, FTP, DB Link 등
 * 5. **주기**: 실시간, 배치 등
 *
 * CRUD 기능:
 * - useAsIsInterface 훅을 사용하여 API 연동
 * - 모달을 통한 추가/수정
 * - 2단계 삭제 확인 UI
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { SECTION_STYLES } from "../constants";
import { SectionHeader } from "./SectionHeader";
import { useAsIsInterface } from "../hooks/useAsIsAnalysis";
import type { AsIsUnitAnalysis, AsIsInterface } from "../types";

interface InterfaceTableProps {
  /** 단위업무 분석 데이터 */
  unitAnalysis: AsIsUnitAnalysis;
}

/** 폼 데이터 타입 */
interface FormData {
  interfaceId: string;
  interfaceName: string;
  description: string;
  sourceSystem: string;
  targetSystem: string;
  interfaceType: string;
  protocol: string;
  frequency: string;
  dataVolume: string;
  remarks: string;
}

/** 초기 폼 데이터 */
const initialFormData: FormData = {
  interfaceId: "",
  interfaceName: "",
  description: "",
  sourceSystem: "",
  targetSystem: "",
  interfaceType: "",
  protocol: "",
  frequency: "",
  dataVolume: "",
  remarks: "",
};

/**
 * 인터페이스 목록 테이블 컴포넌트
 */
export function InterfaceTable({ unitAnalysis }: InterfaceTableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AsIsInterface | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const interfaces = unitAnalysis.interfaces || [];

  // CRUD 훅 사용
  const { create, update, delete: remove, isCreating, isUpdating, isDeleting } = useAsIsInterface();

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
  const handleEdit = (item: AsIsInterface) => {
    setEditingItem(item);
    setFormData({
      interfaceId: item.interfaceId || "",
      interfaceName: item.interfaceName,
      description: item.description || "",
      sourceSystem: item.sourceSystem || "",
      targetSystem: item.targetSystem || "",
      interfaceType: item.interfaceType || "",
      protocol: item.protocol || "",
      frequency: item.frequency || "",
      dataVolume: item.dataVolume || "",
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
    if (!formData.interfaceName.trim()) {
      alert("인터페이스명은 필수 항목입니다.");
      return;
    }

    if (editingItem) {
      // 수정
      update(
        {
          id: editingItem.id,
          data: {
            interfaceId: formData.interfaceId || undefined,
            interfaceName: formData.interfaceName,
            description: formData.description || undefined,
            sourceSystem: formData.sourceSystem || undefined,
            targetSystem: formData.targetSystem || undefined,
            interfaceType: formData.interfaceType || undefined,
            protocol: formData.protocol || undefined,
            frequency: formData.frequency || undefined,
            dataVolume: formData.dataVolume || undefined,
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
          interfaceId: formData.interfaceId || undefined,
          interfaceName: formData.interfaceName,
          description: formData.description || undefined,
          sourceSystem: formData.sourceSystem || undefined,
          targetSystem: formData.targetSystem || undefined,
          interfaceType: formData.interfaceType || undefined,
          protocol: formData.protocol || undefined,
          frequency: formData.frequency || undefined,
          dataVolume: formData.dataVolume || undefined,
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
    <div className={`rounded-xl border ${SECTION_STYLES.interface.borderColor} ${SECTION_STYLES.interface.bgColor} dark:bg-opacity-20 overflow-hidden`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800">
        <SectionHeader
          style={SECTION_STYLES.interface}
          collapsible
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          isConditional
          rightElement={
            <Button variant="outline" size="sm" leftIcon="add" onClick={handleAdd} disabled={isPending}>
              인터페이스 추가
            </Button>
          }
        />
      </div>

      {/* 테이블 */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {interfaces.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="swap_horiz" size="lg" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">등록된 인터페이스가 없습니다</p>
              <p className="text-xs text-text-secondary mt-1">
                &apos;인터페이스 추가&apos; 버튼을 클릭하여 인터페이스를 등록하세요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-blue-100/50 dark:bg-blue-900/20 text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-4 py-3 text-left w-28">I/F ID</th>
                  <th className="px-4 py-3 text-left">인터페이스명</th>
                  <th className="px-4 py-3 text-left w-28">송신</th>
                  <th className="px-4 py-3 text-left w-28">수신</th>
                  <th className="px-4 py-3 text-left w-20">유형</th>
                  <th className="px-4 py-3 text-left w-20">프로토콜</th>
                  <th className="px-4 py-3 text-left w-20">주기</th>
                  <th className="px-4 py-3 text-center w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {interfaces.map((iface) => (
                  <tr
                    key={iface.id}
                    className="border-t border-blue-100 dark:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-text-secondary">
                      {iface.interfaceId || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text dark:text-white">
                      {iface.interfaceName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {iface.sourceSystem || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {iface.targetSystem || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {iface.interfaceType ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                          {iface.interfaceType}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {iface.protocol || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {iface.frequency || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === iface.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(iface.id)}
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
                            onClick={() => handleEdit(iface)}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                          >
                            <Icon name="edit" size="xs" className="text-text-secondary hover:text-primary" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(iface.id)}
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
                  {editingItem ? "인터페이스 수정" : "인터페이스 추가"}
                </h3>
                <button onClick={handleCloseModal} className="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark">
                  <Icon name="close" size="sm" className="text-text-secondary" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    인터페이스 ID
                  </label>
                  <Input
                    value={formData.interfaceId}
                    onChange={(e) => handleInputChange("interfaceId", e.target.value)}
                    placeholder="예: IF001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    인터페이스명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.interfaceName}
                    onChange={(e) => handleInputChange("interfaceName", e.target.value)}
                    placeholder="예: ERP-MES 자재정보 연동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text dark:text-white mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="인터페이스에 대한 상세 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      송신 시스템
                    </label>
                    <Input
                      value={formData.sourceSystem}
                      onChange={(e) => handleInputChange("sourceSystem", e.target.value)}
                      placeholder="예: ERP"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      수신 시스템
                    </label>
                    <Input
                      value={formData.targetSystem}
                      onChange={(e) => handleInputChange("targetSystem", e.target.value)}
                      placeholder="예: MES"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      인터페이스 유형
                    </label>
                    <select
                      value={formData.interfaceType}
                      onChange={(e) => handleInputChange("interfaceType", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">선택</option>
                      <option value="단방향">단방향</option>
                      <option value="양방향">양방향</option>
                      <option value="실시간">실시간</option>
                      <option value="배치">배치</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      프로토콜
                    </label>
                    <select
                      value={formData.protocol}
                      onChange={(e) => handleInputChange("protocol", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-slate-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">선택</option>
                      <option value="REST API">REST API</option>
                      <option value="SOAP">SOAP</option>
                      <option value="FTP">FTP</option>
                      <option value="SFTP">SFTP</option>
                      <option value="DB Link">DB Link</option>
                      <option value="MQ">MQ</option>
                      <option value="Kafka">Kafka</option>
                      <option value="파일">파일</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      주기
                    </label>
                    <Input
                      value={formData.frequency}
                      onChange={(e) => handleInputChange("frequency", e.target.value)}
                      placeholder="예: 실시간, 일 1회"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-white mb-1">
                      데이터량
                    </label>
                    <Input
                      value={formData.dataVolume}
                      onChange={(e) => handleInputChange("dataVolume", e.target.value)}
                      placeholder="예: 일 10,000건"
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
