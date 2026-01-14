/**
 * @file src/app/dashboard/process-verification/components/EditItemModal.tsx
 * @description
 * 공정검증 항목 수정 모달 컴포넌트입니다.
 * 항목의 모든 필드를 편집할 수 있습니다.
 */

"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui";
import {
  ProcessVerificationItem,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";
import { BUSINESS_UNITS } from "@/constants/business-units";

interface EditItemModalProps {
  item: ProcessVerificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<ProcessVerificationItem>) => Promise<void>;
}

/**
 * 항목 수정 모달 컴포넌트
 */
export default function EditItemModal({
  item,
  isOpen,
  onClose,
  onSave,
}: EditItemModalProps) {
  const toast = useToast();

  const [formData, setFormData] = useState({
    category: "",
    isApplied: false,
    managementArea: "",
    detailItem: "",
    mesMapping: "",
    verificationDetail: "",
    managementCode: "",
    acceptanceStatus: "",
    existingMes: false,
    customerRequest: "",
    remarks: "",
    status: "PENDING" as VerificationStatus,
    businessUnit: "V_IVI",
  });
  const [isSaving, setIsSaving] = useState(false);

  // 항목이 변경되면 폼 데이터 초기화
  useEffect(() => {
    if (item) {
      setFormData({
        category: item.category || "",
        isApplied: item.isApplied || false,
        managementArea: item.managementArea || "",
        detailItem: item.detailItem || "",
        mesMapping: item.mesMapping || "",
        verificationDetail: item.verificationDetail || "",
        managementCode: item.managementCode || "",
        acceptanceStatus: item.acceptanceStatus || "",
        existingMes: item.existingMes || false,
        customerRequest: item.customerRequest || "",
        remarks: item.remarks || "",
        status: item.status || "PENDING",
        businessUnit: item.businessUnit || "V_IVI",
      });
    }
  }, [item]);

  // 저장 핸들러
  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      await onSave(item.id, formData);
      onClose();
    } catch (error) {
      console.error("저장 실패:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 입력 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            항목 수정
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-500 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* 관리코드 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                관리코드
              </label>
              <input
                type="text"
                name="managementCode"
                value={formData.managementCode}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 사업부 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                사업부
              </label>
              <select
                name="businessUnit"
                value={formData.businessUnit}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {BUSINESS_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* 구분 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                구분
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 관리 영역 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                관리 영역
              </label>
              <input
                type="text"
                name="managementArea"
                value={formData.managementArea}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 세부 관리 항목 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                세부 관리 항목
              </label>
              <input
                type="text"
                name="detailItem"
                value={formData.detailItem}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* MES/IT 매핑 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                MES/IT 매핑
              </label>
              <input
                type="text"
                name="mesMapping"
                value={formData.mesMapping}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 세부 검증 내용 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                세부 검증 내용
              </label>
              <textarea
                name="verificationDetail"
                value={formData.verificationDetail}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 수용 여부 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                수용 여부
              </label>
              <input
                type="text"
                name="acceptanceStatus"
                value={formData.acceptanceStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 상태 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                상태
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(verificationStatusConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 고객 요청 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                고객 요청
              </label>
              <input
                type="text"
                name="customerRequest"
                value={formData.customerRequest}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 비고 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                비고
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 체크박스들 */}
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isApplied"
                  checked={formData.isApplied}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">적용</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="existingMes"
                  checked={formData.existingMes}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">기존 MES</span>
              </label>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
