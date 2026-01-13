/**
 * @file src/app/dashboard/equipment/components/AddEquipmentModal.tsx
 * @description
 * 새 설비 추가 모달 컴포넌트
 *
 * 초보자 가이드:
 * 1. **기본 정보**: 이름, 타입, 상태 입력
 * 2. **선택 정보**: 위치, 설명, 제조사 정보
 * 3. **저장**: 새 설비 생성 후 모달 닫기
 *
 * 수정 방법:
 * - 필드 추가: formData에 필드 추가 및 input 추가
 */

"use client";

import { useState } from "react";
import { EquipmentType, EquipmentStatus, SystemType } from "@/lib/api";
import { useCreateEquipment } from "../hooks/useEquipment";
import { STATUS_CONFIG, TYPE_CONFIG, SYSTEM_TYPE_CONFIG } from "../types";

/** Props 타입 */
interface AddEquipmentModalProps {
  projectId: string;
  onClose: () => void;
}

/**
 * 설비 추가 모달 컴포넌트
 */
export function AddEquipmentModal({ projectId, onClose }: AddEquipmentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "MACHINE" as EquipmentType,
    status: "ACTIVE" as EquipmentStatus,
    location: "",
    lineCode: "",
    divisionCode: "",
    imageUrl: "",
    description: "",
    manufacturer: "",
    modelNumber: "",
    serialNumber: "",
    ipAddress: "",
    portNumber: null as number | null,
    isLogTarget: false,
    isInterlockTarget: false,
    isBarcodeEnabled: false,
    systemType: null as SystemType | null,
    logCollectionPath: "",
  });

  const createEquipment = useCreateEquipment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert("설비명은 필수입니다.");
      return;
    }

    await createEquipment.mutateAsync({
      projectId,
      name: formData.name,
      type: formData.type,
      status: formData.status,
      location: formData.location || undefined,
      lineCode: formData.lineCode || undefined,
      divisionCode: formData.divisionCode || undefined,
      imageUrl: formData.imageUrl || undefined,
      description: formData.description || undefined,
      manufacturer: formData.manufacturer || undefined,
      modelNumber: formData.modelNumber || undefined,
      serialNumber: formData.serialNumber || undefined,
      ipAddress: formData.ipAddress || undefined,
      portNumber: formData.portNumber || undefined,
      isLogTarget: formData.isLogTarget,
      isInterlockTarget: formData.isInterlockTarget,
      isBarcodeEnabled: formData.isBarcodeEnabled,
      systemType: formData.systemType || undefined,
      logCollectionPath: formData.logCollectionPath || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-surface-dark rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="p-6 border-b border-border dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text dark:text-white">새 설비 추가</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            새 설비의 기본 정보를 입력하세요.
          </p>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* 설비명 */}
            <div>
              <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                설비명 <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 프레스 1호기"
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* 타입 + 상태 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                  타입 <span className="text-error">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EquipmentType })}
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EquipmentStatus })}
                  className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 위치 */}
            <div>
              <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                위치
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="예: 1공장 2라인"
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 라인코드 */}
            <div>
              <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                라인코드
              </label>
              <input
                type="text"
                value={formData.lineCode}
                onChange={(e) => setFormData({ ...formData, lineCode: e.target.value })}
                placeholder="예: L1, L2, LINE-A"
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 사업부 코드 */}
            <div>
              <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                사업부 코드
              </label>
              <input
                type="text"
                value={formData.divisionCode}
                onChange={(e) => setFormData({ ...formData, divisionCode: e.target.value })}
                placeholder="예: DIV-A, 사업부1"
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 이미지 URL */}
            <div>
              <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                이미지 URL
              </label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="설비 이미지 URL 입력"
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formData.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt="이미지 미리보기"
                  className="mt-2 w-full h-32 object-cover rounded-lg border border-border dark:border-border-dark"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>

            {/* 설명 */}
            <div>
              <label className="text-sm font-medium text-text dark:text-white mb-1 block">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="설비에 대한 상세 설명을 입력하세요"
                className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* 제조사 정보 */}
            <div className="border-t border-border dark:border-border-dark pt-4">
              <h3 className="text-sm font-semibold text-text dark:text-white mb-3">제조사 정보 (선택)</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">제조사</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="예: Samsung"
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-secondary mb-1 block">모델번호</label>
                  <input
                    type="text"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                    placeholder="예: XYZ-1000"
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-secondary mb-1 block">시리얼번호</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="예: SN123456789"
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* 네트워크/시스템 정보 */}
            <div className="border-t border-border dark:border-border-dark pt-4">
              <h3 className="text-sm font-semibold text-text dark:text-white mb-3">네트워크/시스템 정보 (선택)</h3>

              <div className="space-y-3">
                {/* 시스템 종류 */}
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">시스템 종류</label>
                  <select
                    value={formData.systemType || ""}
                    onChange={(e) => setFormData({ ...formData, systemType: e.target.value as SystemType || null })}
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">선택 안함</option>
                    {Object.entries(SYSTEM_TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 로그수집위치 */}
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">로그수집위치</label>
                  <input
                    type="text"
                    value={formData.logCollectionPath}
                    onChange={(e) => setFormData({ ...formData, logCollectionPath: e.target.value })}
                    placeholder="예: C:\Logs, /var/log"
                    className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* 푸터 */}
        <div className="p-6 border-t border-border dark:border-border-dark flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-background-dark/80 text-text dark:text-white rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={createEquipment.isPending}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {createEquipment.isPending ? "추가 중..." : "설비 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
