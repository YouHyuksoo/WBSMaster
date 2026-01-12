/**
 * @file src/app/dashboard/equipment/components/EquipmentSidebar.tsx
 * @description
 * 설비 상세 정보 우측 사이드바 컴포넌트
 * 선택된 설비의 정보를 표시하고 편집합니다.
 *
 * 초보자 가이드:
 * 1. **기본 정보**: 이름, 상태, 타입, 위치 등 편집
 * 2. **동적 속성**: 사용자 정의 속성 목록 표시
 * 3. **저장/취소**: 변경사항 저장 또는 사이드바 닫기
 *
 * 수정 방법:
 * - 편집 필드 추가: editData에 필드 추가
 * - 속성 관리: TODO 부분 구현
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Equipment } from "@/lib/api";
import { useUpdateEquipment, useDeleteEquipment } from "../hooks/useEquipment";
import { STATUS_CONFIG, TYPE_CONFIG } from "../types";
import { PropertyEditor } from "./PropertyEditor";
import { BUSINESS_UNITS } from "@/constants/business-units";
import { LOCATIONS } from "@/constants/locations";

/** Props 타입 */
interface EquipmentSidebarProps {
  equipment: Equipment;
  onClose: () => void;
}

/**
 * 설비 상세 사이드바 컴포넌트
 */
export function EquipmentSidebar({ equipment, onClose }: EquipmentSidebarProps) {
  const [editData, setEditData] = useState(equipment);
  const [activeTab, setActiveTab] = useState<"basic" | "properties">("basic");
  const sidebarRef = useRef<HTMLDivElement>(null);

  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();

  // equipment prop 변경 시 editData 업데이트
  useEffect(() => {
    setEditData(equipment);
    setActiveTab("basic"); // 새 설비 선택 시 기본 정보 탭으로 초기화
  }, [equipment.id]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 약간의 딜레이 후 이벤트 리스너 추가 (사이드바 열림 애니메이션 후)
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSave = async () => {
    await updateEquipment.mutateAsync({
      id: equipment.id,
      data: {
        name: editData.name,
        status: editData.status,
        type: editData.type,
        description: editData.description,
        location: editData.location,
        lineCode: editData.lineCode,
        divisionCode: editData.divisionCode,
        imageUrl: editData.imageUrl,
        manufacturer: editData.manufacturer,
        modelNumber: editData.modelNumber,
        serialNumber: editData.serialNumber,
        ipAddress: editData.ipAddress,
        portNumber: editData.portNumber,
        isLogTarget: editData.isLogTarget,
        isInterlockTarget: editData.isInterlockTarget,
        isBarcodeEnabled: editData.isBarcodeEnabled,
      },
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm("정말 이 설비를 삭제하시겠습니까?")) return;
    await deleteEquipment.mutateAsync(equipment.id);
    onClose();
  };

  return (
    <div
      ref={sidebarRef}
      className="w-[420px] border-l border-border dark:border-border-dark bg-background-white dark:bg-surface-dark flex flex-col h-full overflow-hidden animate-slide-in-right shadow-2xl"
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text dark:text-white">설비 상세</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-text-secondary mt-1">{equipment.code}</p>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 p-2 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark">
        <button
          onClick={() => setActiveTab("basic")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "basic"
              ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
              : "text-text-secondary hover:text-text dark:hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            info
          </span>
          <span>기본 정보</span>
        </button>
        <button
          onClick={() => setActiveTab("properties")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "properties"
              ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
              : "text-text-secondary hover:text-text dark:hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            tune
          </span>
          <span>속성 정보</span>
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* 기본 정보 탭 */}
        {activeTab === "basic" && (
          <>
        {/* 설비명 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0">
            설비명:
          </label>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 타입 + 상태 (1행) */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0">
            타입:
          </label>
          <select
            value={editData.type}
            onChange={(e) => setEditData({ ...editData, type: e.target.value as any })}
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          <label className="text-xs font-medium text-text dark:text-white w-10 shrink-0 text-right">
            상태:
          </label>
          <select
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
            className="w-20 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* 위치 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0">
            위치:
          </label>
          <select
            value={editData.location || ""}
            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">선택 안함</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* 라인코드 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0">
            라인코드:
          </label>
          <input
            type="text"
            value={editData.lineCode || ""}
            onChange={(e) => setEditData({ ...editData, lineCode: e.target.value })}
            placeholder="예: L1, L2, LINE-A"
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 사업부 코드 */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0">
            사업부:
          </label>
          <select
            value={editData.divisionCode || ""}
            onChange={(e) => setEditData({ ...editData, divisionCode: e.target.value })}
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">선택 안함</option>
            {BUSINESS_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        {/* 이미지 URL */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0">
            이미지:
          </label>
          <input
            type="text"
            value={editData.imageUrl || ""}
            onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
            placeholder="이미지 URL 입력"
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {editData.imageUrl && (
          <div className="pl-[72px]">
            <img
              src={editData.imageUrl}
              alt="설비 이미지 미리보기"
              className="w-full h-24 object-cover rounded-lg border border-border dark:border-border-dark"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* 설명 */}
        <div className="flex gap-2">
          <label className="text-xs font-medium text-text dark:text-white w-16 shrink-0 pt-1.5">
            설명:
          </label>
          <textarea
            value={editData.description || ""}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            rows={2}
            className="flex-1 px-2 py-1.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* 제조사 정보 */}
        <div className="border-t border-border dark:border-border-dark pt-3">
          <h3 className="text-xs font-semibold text-text dark:text-white mb-2">제조사 정보</h3>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary w-16 shrink-0">제조사:</label>
              <input
                type="text"
                value={editData.manufacturer || ""}
                onChange={(e) => setEditData({ ...editData, manufacturer: e.target.value })}
                className="flex-1 px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary w-16 shrink-0">모델번호:</label>
              <input
                type="text"
                value={editData.modelNumber || ""}
                onChange={(e) => setEditData({ ...editData, modelNumber: e.target.value })}
                className="flex-1 px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary w-16 shrink-0">시리얼번호:</label>
              <input
                type="text"
                value={editData.serialNumber || ""}
                onChange={(e) => setEditData({ ...editData, serialNumber: e.target.value })}
                className="flex-1 px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* 네트워크 및 연동 정보 */}
        <div className="border border-border dark:border-border-dark rounded-lg p-2">
          <h3 className="text-[10px] font-semibold text-text dark:text-white mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              settings_ethernet
            </span>
            네트워크 및 연동 정보
          </h3>
          <div className="space-y-1.5">
            {/* IP 주소 */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary w-16 shrink-0">IP 주소:</label>
              <input
                type="text"
                value={editData.ipAddress || ""}
                onChange={(e) => setEditData({ ...editData, ipAddress: e.target.value })}
                placeholder="예: 192.168.1.100"
                className="flex-1 px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* PORT 번호 */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary w-16 shrink-0">PORT:</label>
              <input
                type="number"
                value={editData.portNumber || ""}
                onChange={(e) => setEditData({ ...editData, portNumber: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="예: 8080"
                className="flex-1 px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 체크박스 옵션들 */}
            <div className="space-y-1 pt-1.5 border-t border-border dark:border-border-dark">
              {/* 로그수집대상 */}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-surface dark:hover:bg-background-dark p-1.5 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={editData.isLogTarget || false}
                  onChange={(e) => setEditData({ ...editData, isLogTarget: e.target.checked })}
                  className="w-3 h-3 text-primary bg-surface dark:bg-background-dark border-border dark:border-border-dark rounded focus:ring-primary focus:ring-2"
                />
                <span className="text-[10px] text-text dark:text-white">로그수집대상</span>
              </label>

              {/* 인터락대상 */}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-surface dark:hover:bg-background-dark p-1.5 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={editData.isInterlockTarget || false}
                  onChange={(e) => setEditData({ ...editData, isInterlockTarget: e.target.checked })}
                  className="w-3 h-3 text-primary bg-surface dark:bg-background-dark border-border dark:border-border-dark rounded focus:ring-primary focus:ring-2"
                />
                <span className="text-[10px] text-text dark:text-white">인터락대상</span>
              </label>

              {/* 바코드 식별가능 */}
              <label className="flex items-center gap-2 cursor-pointer hover:bg-surface dark:hover:bg-background-dark p-1.5 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={editData.isBarcodeEnabled || false}
                  onChange={(e) => setEditData({ ...editData, isBarcodeEnabled: e.target.checked })}
                  className="w-3 h-3 text-primary bg-surface dark:bg-background-dark border-border dark:border-border-dark rounded focus:ring-primary focus:ring-2"
                />
                <span className="text-[10px] text-text dark:text-white">바코드 식별가능</span>
              </label>
            </div>
          </div>
        </div>

          </>
        )}

        {/* 속성 정보 탭 */}
        {activeTab === "properties" && (
          <div>
            <PropertyEditor equipmentId={equipment.id} />
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-4 border-t border-border dark:border-border-dark flex gap-2">
        {activeTab === "basic" ? (
          <>
            {/* 기본 정보 탭 푸터 */}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-colors"
            >
              삭제
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-background-dark/80 text-text dark:text-white rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
              disabled={updateEquipment.isPending}
            >
              {updateEquipment.isPending ? "저장 중..." : "저장"}
            </button>
          </>
        ) : (
          <>
            {/* 속성 정보 탭 푸터 */}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-background-dark/80 text-text dark:text-white rounded-lg transition-colors"
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
