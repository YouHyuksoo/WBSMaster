/**
 * @file src/app/dashboard/process-verification/components/AddItemModal.tsx
 * @description
 * 공정검증 항목 추가 모달 컴포넌트입니다.
 * 관리코드 체계: 이니셜(카테고리) + 그룹번호 + 고유순번
 * 예: M-1-01 (M=재료관리, 1=그룹, 01=순번)
 *
 * 초보자 가이드:
 * 1. 이니셜을 선택하면 카테고리가 자동 매핑됩니다.
 * 2. 그룹번호를 입력합니다.
 * 3. 순번은 자동으로 생성됩니다.
 * 4. 관리코드 = 이니셜-그룹번호-순번
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ProcessVerificationCategory,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";

/**
 * 이니셜과 카테고리 매핑 정보
 */
interface InitialMapping {
  initial: string;
  categoryCode: string;
  categoryName: string;
}

/**
 * 기본 이니셜-카테고리 매핑
 * 새로운 이니셜 입력 시 자동으로 카테고리가 생성됨
 */
const DEFAULT_INITIAL_MAPPINGS: InitialMapping[] = [
  { initial: "M", categoryCode: "MATERIAL", categoryName: "재료관리" },
  { initial: "S", categoryCode: "SMD_PROCESS", categoryName: "SMD공정관리" },
  { initial: "P", categoryCode: "POST_PROCESS", categoryName: "후공정관리" },
  { initial: "F", categoryCode: "FIRMWARE", categoryName: "펌웨어SW관리" },
  { initial: "O", categoryCode: "OTP_ROM", categoryName: "OTP롬라이팅관리" },
  { initial: "I", categoryCode: "INSPECTION", categoryName: "검사관리" },
  { initial: "T", categoryCode: "TRACEABILITY", categoryName: "추적성관리" },
  { initial: "FP", categoryCode: "FOOLPROOF", categoryName: "풀프루프관리" },
  { initial: "Q", categoryCode: "QUALITY", categoryName: "품질관리" },
  { initial: "R", categoryCode: "REPAIR", categoryName: "수리관리" },
  { initial: "RW", categoryCode: "REWORK", categoryName: "재작업관리" },
  { initial: "W", categoryCode: "WMS_LOGISTICS", categoryName: "WMS물류관리" },
  { initial: "WO", categoryCode: "WORK_ORDER", categoryName: "작업지시관리" },
  { initial: "E", categoryCode: "EQUIPMENT", categoryName: "설비관리" },
  { initial: "C", categoryCode: "CONSUMABLE", categoryName: "소모품관리" },
  { initial: "FD", categoryCode: "FEEDER", categoryName: "피더관리" },
  { initial: "L", categoryCode: "LABEL", categoryName: "라벨관리" },
  { initial: "MO", categoryCode: "MONITORING", categoryName: "분석및모니터링" },
  { initial: "EP", categoryCode: "EPOXY", categoryName: "에폭시관리" },
  { initial: "FL", categoryCode: "FLUX", categoryName: "플럭스관리" },
  { initial: "CJ", categoryCode: "CARRIER_JIG", categoryName: "캐리어지그관리" },
  { initial: "MG", categoryCode: "MAGAZINE", categoryName: "이송용매거진관리" },
];

/**
 * 새 항목 생성 데이터 타입
 */
interface NewItemData {
  categoryId: string;
  category: string;
  isApplied: boolean;
  managementArea: string;
  detailItem: string;
  mesMapping: string;
  verificationDetail: string;
  managementCode: string;
  acceptanceStatus: string;
  existingMes: boolean;
  customerRequest: string;
  remarks: string;
  status: VerificationStatus;
}

/**
 * 새 카테고리 생성 데이터 타입
 */
interface NewCategoryData {
  code: string;
  name: string;
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewItemData) => Promise<void>;
  onCreateCategory: (data: NewCategoryData) => Promise<ProcessVerificationCategory>;
  categories: ProcessVerificationCategory[];
  defaultCategoryId?: string | null;
}

/**
 * 항목 추가 모달 컴포넌트
 */
export default function AddItemModal({
  isOpen,
  onClose,
  onSave,
  onCreateCategory,
  categories,
}: AddItemModalProps) {
  // 관리코드 구성 요소
  const [initial, setInitial] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [sequenceNumber, setSequenceNumber] = useState("01");

  // 자동 매핑된 카테고리 정보
  const [mappedCategory, setMappedCategory] = useState<ProcessVerificationCategory | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formData, setFormData] = useState<Omit<NewItemData, "categoryId" | "category" | "managementCode">>({
    isApplied: false,
    managementArea: "",
    detailItem: "",
    mesMapping: "",
    verificationDetail: "",
    acceptanceStatus: "",
    existingMes: false,
    customerRequest: "",
    remarks: "",
    status: "PENDING",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingSequence, setIsLoadingSequence] = useState(false);

  /**
   * 이니셜로 카테고리 찾기
   */
  const findCategoryByInitial = useCallback((init: string): ProcessVerificationCategory | null => {
    if (!init) return null;

    // 기존 카테고리에서 이니셜로 시작하는 코드 찾기
    const upperInit = init.toUpperCase();

    // 정확히 매핑되는 카테고리 찾기
    const mapping = DEFAULT_INITIAL_MAPPINGS.find(m => m.initial === upperInit);
    if (mapping) {
      const existing = categories.find(c => c.code === mapping.categoryCode);
      if (existing) return existing;
    }

    // 코드가 이니셜로 시작하는 카테고리 찾기
    const found = categories.find(c =>
      c.code.startsWith(upperInit) ||
      c.name.startsWith(upperInit)
    );

    return found || null;
  }, [categories]);

  /**
   * 다음 순번 조회
   */
  const fetchNextSequence = useCallback(async (init: string, group: string) => {
    if (!init || !group) {
      setSequenceNumber("01");
      return;
    }

    setIsLoadingSequence(true);
    try {
      // 패턴: INITIAL-GROUP-## 형식의 관리코드 중 가장 큰 순번 찾기
      const pattern = `${init.toUpperCase()}-${group}-`;
      const res = await fetch(
        `/api/process-verification/items?search=${encodeURIComponent(pattern)}`
      );

      if (res.ok) {
        const items = await res.json();
        let maxSeq = 0;

        items.forEach((item: { managementCode: string }) => {
          const code = item.managementCode;
          if (code.startsWith(pattern)) {
            const seqPart = code.substring(pattern.length);
            const seq = parseInt(seqPart, 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        });

        setSequenceNumber(String(maxSeq + 1).padStart(2, "0"));
      }
    } catch (error) {
      console.error("순번 조회 실패:", error);
      setSequenceNumber("01");
    } finally {
      setIsLoadingSequence(false);
    }
  }, []);

  /**
   * 생성될 관리코드 미리보기
   */
  const previewManagementCode = initial && groupNumber
    ? `${initial.toUpperCase()}-${groupNumber}-${sequenceNumber}`
    : "";

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setInitial("");
      setGroupNumber("");
      setSequenceNumber("01");
      setMappedCategory(null);
      setIsNewCategory(false);
      setNewCategoryName("");
      setFormData({
        isApplied: false,
        managementArea: "",
        detailItem: "",
        mesMapping: "",
        verificationDetail: "",
        acceptanceStatus: "",
        existingMes: false,
        customerRequest: "",
        remarks: "",
        status: "PENDING",
      });
      setErrors({});
    }
  }, [isOpen]);

  // 이니셜 변경 시 카테고리 매핑
  useEffect(() => {
    if (!initial) {
      setMappedCategory(null);
      setIsNewCategory(false);
      return;
    }

    const found = findCategoryByInitial(initial);
    if (found) {
      setMappedCategory(found);
      setIsNewCategory(false);
    } else {
      setMappedCategory(null);
      setIsNewCategory(true);
      // 기본 매핑에서 이름 가져오기
      const mapping = DEFAULT_INITIAL_MAPPINGS.find(m => m.initial === initial.toUpperCase());
      if (mapping) {
        setNewCategoryName(mapping.categoryName);
      } else {
        setNewCategoryName("");
      }
    }
  }, [initial, findCategoryByInitial]);

  // 이니셜, 그룹번호 변경 시 순번 조회
  useEffect(() => {
    if (initial && groupNumber) {
      fetchNextSequence(initial, groupNumber);
    }
  }, [initial, groupNumber, fetchNextSequence]);

  // 입력 검증
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!initial.trim()) {
      newErrors.initial = "이니셜을 입력해주세요.";
    }
    if (!groupNumber.trim()) {
      newErrors.groupNumber = "그룹번호를 입력해주세요.";
    }
    if (isNewCategory && !newCategoryName.trim()) {
      newErrors.newCategoryName = "카테고리 이름을 입력해주세요.";
    }
    if (!formData.managementArea.trim()) {
      newErrors.managementArea = "관리 영역을 입력해주세요.";
    }
    if (!formData.detailItem.trim()) {
      newErrors.detailItem = "세부 관리 항목을 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      let categoryId = mappedCategory?.id || "";
      let categoryName = mappedCategory?.name || "";

      // 새 카테고리 생성이 필요한 경우
      if (isNewCategory) {
        const categoryCode = initial.toUpperCase();
        const newCategory = await onCreateCategory({
          code: categoryCode,
          name: newCategoryName.trim(),
        });
        categoryId = newCategory.id;
        categoryName = newCategory.name;
      }

      const managementCode = `${initial.toUpperCase()}-${groupNumber}-${sequenceNumber}`;

      await onSave({
        ...formData,
        categoryId,
        category: categoryName,
        managementCode,
      });
      onClose();
    } catch (error) {
      console.error("저장 실패:", error);
      const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
      alert(message);
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

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            새 항목 추가
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="grid grid-cols-2 gap-4">

            {/* 관리코드 구성 섹션 */}
            <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                관리코드 구성 <span className="text-red-500">*</span>
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {/* 이니셜 (카테고리) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    이니셜 (카테고리)
                  </label>
                  <input
                    type="text"
                    value={initial}
                    onChange={(e) => {
                      setInitial(e.target.value.toUpperCase());
                      if (errors.initial) setErrors(prev => ({ ...prev, initial: "" }));
                    }}
                    placeholder="M, S, P..."
                    maxLength={3}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono font-bold ${
                      errors.initial ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                  {errors.initial && (
                    <p className="mt-1 text-xs text-red-500">{errors.initial}</p>
                  )}
                </div>

                {/* 그룹번호 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    그룹번호
                  </label>
                  <input
                    type="text"
                    value={groupNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setGroupNumber(val);
                      if (errors.groupNumber) setErrors(prev => ({ ...prev, groupNumber: "" }));
                    }}
                    placeholder="1, 2, 3..."
                    maxLength={2}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono font-bold ${
                      errors.groupNumber ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                    }`}
                  />
                  {errors.groupNumber && (
                    <p className="mt-1 text-xs text-red-500">{errors.groupNumber}</p>
                  )}
                </div>

                {/* 순번 (자동) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    순번 (자동)
                    {isLoadingSequence && (
                      <span className="ml-1 text-blue-500 animate-pulse">...</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={sequenceNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").padStart(2, "0");
                      setSequenceNumber(val.slice(-2));
                    }}
                    placeholder="01"
                    maxLength={2}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-center font-mono font-bold"
                  />
                </div>
              </div>

              {/* 관리코드 미리보기 */}
              {previewManagementCode && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    생성될 관리코드: <span className="font-mono font-bold text-sm">{previewManagementCode}</span>
                  </p>
                </div>
              )}

              {/* 매핑된 카테고리 표시 */}
              {initial && (
                <div className="mt-3">
                  {mappedCategory ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>카테고리: <strong>{mappedCategory.name}</strong> ({mappedCategory.code})</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>새 카테고리가 생성됩니다</span>
                      </div>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => {
                          setNewCategoryName(e.target.value);
                          if (errors.newCategoryName) setErrors(prev => ({ ...prev, newCategoryName: "" }));
                        }}
                        placeholder="카테고리 이름 입력"
                        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.newCategoryName ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                        }`}
                      />
                      {errors.newCategoryName && (
                        <p className="text-xs text-red-500">{errors.newCategoryName}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 관리 영역 (필수) */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                관리 영역 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="managementArea"
                value={formData.managementArea}
                onChange={handleChange}
                placeholder="예: 생산관리"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.managementArea ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {errors.managementArea && (
                <p className="mt-1 text-xs text-red-500">{errors.managementArea}</p>
              )}
            </div>

            {/* 세부 관리 항목 (필수) */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                세부 관리 항목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="detailItem"
                value={formData.detailItem}
                onChange={handleChange}
                placeholder="예: 작업지시 생성/수정/삭제"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.detailItem ? "border-red-500" : "border-slate-300 dark:border-slate-600"
                }`}
              />
              {errors.detailItem && (
                <p className="mt-1 text-xs text-red-500">{errors.detailItem}</p>
              )}
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
                placeholder="예: 작업지시관리 모듈"
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
                placeholder="검증 내용을 입력하세요..."
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
            disabled={isSaving || isLoadingSequence}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "저장 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
