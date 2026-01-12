/**
 * @file src/app/dashboard/equipment/components/EquipmentNode.tsx
 * @description
 * React Flow 커스텀 노드 컴포넌트
 * 설비 노드를 렌더링하고 연결 핸들을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **Handle**: React Flow의 연결 포인트 (source: 출발, target: 도착)
 * 2. **data.equipment**: 설비 정보 (코드, 이름, 타입, 상태)
 * 3. **data.isSelected**: 선택 상태 (부모에서 전달)
 * 4. **호버 이미지**: equipment.imageUrl이 있으면 호버 시 이미지 표시
 *
 * 수정 방법:
 * - 노드 디자인 변경: className 수정
 * - 표시 정보 변경: data.equipment의 필드 추가/제거
 * - 이미지 툴팁 크기: 툴팁 className의 w-/h- 값 수정
 */

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Equipment } from "@/lib/api";
import { STATUS_CONFIG, TYPE_CONFIG } from "../types";

/** 노드 데이터 타입 */
interface EquipmentNodeData {
  equipment: Equipment;
  isSelected: boolean;
  onRemove?: (nodeId: string) => void;
}

/**
 * 설비 커스텀 노드 컴포넌트
 */
export const EquipmentNode = memo(({ data }: NodeProps<EquipmentNodeData>) => {
  const { equipment, isSelected, onRemove } = data;
  const statusInfo = STATUS_CONFIG[equipment.status];
  const typeInfo = TYPE_CONFIG[equipment.type];
  const [isHovered, setIsHovered] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);

  return (
    <div
      className={`
        px-4 py-3 rounded-xl border-2 bg-white dark:bg-surface-dark shadow-lg min-w-[260px]
        transition-all cursor-pointer relative
        ${isSelected ? "ring-2 ring-primary shadow-2xl scale-105" : "hover:shadow-xl"}
        ${statusInfo.borderColor}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 호버 시 액션 버튼 */}
      {isHovered && (
        <div className="absolute -top-3 -right-3 flex gap-1 z-10">
          {/* 이미지 보기 버튼 */}
          {equipment.imageUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowImagePopup(!showImagePopup);
              }}
              className="size-7 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
              title="이미지 보기"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                image
              </span>
            </button>
          )}
          {/* 삭제 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onRemove) {
                onRemove(equipment.id);
              }
            }}
            className="size-7 rounded-full bg-error hover:bg-error/90 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
            title="캔버스에서 제거"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* 연결 핸들들 - 각 방향마다 하나씩만 (source로 설정하되 양방향 연결 가능) */}

      {/* 상단 */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />

      {/* 우측 */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />

      {/* 하단 */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />

      {/* 좌측 */}
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!bg-primary !w-3 !h-3 !border-2 !border-white dark:!border-surface-dark"
      />

      {/* 헤더: 코드 + 타입 아이콘 + 상태 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-secondary dark:text-text-secondary">
            {equipment.code}
          </span>
          {/* 타입 아이콘 (상단) */}
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
              {typeInfo.icon}
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bgColor}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {statusInfo.icon}
          </span>
          <span className={`text-xs font-bold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* 설비명 */}
      <h4 className="text-sm font-semibold text-text dark:text-white mb-1 truncate">
        {equipment.name}
      </h4>

      {/* 타입 */}
      <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-text-secondary mb-2">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {typeInfo.icon}
        </span>
        <span>{typeInfo.label}</span>
      </div>

      {/* 연동 상태 아이콘들 */}
      {(equipment.isLogTarget || equipment.isBarcodeEnabled || equipment.isInterlockTarget) && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border dark:border-border-dark">
          {/* 로그수집대상 */}
          {equipment.isLogTarget && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20"
              title="로그수집대상"
            >
              <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 14 }}>
                description
              </span>
              <span className="text-[10px] font-medium text-blue-500">LOG</span>
            </div>
          )}

          {/* 바코드 식별가능 */}
          {equipment.isBarcodeEnabled && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20"
              title="바코드 식별가능"
            >
              <span className="material-symbols-outlined text-purple-500" style={{ fontSize: 14 }}>
                qr_code_scanner
              </span>
              <span className="text-[10px] font-medium text-purple-500">QR</span>
            </div>
          )}

          {/* 인터락대상 */}
          {equipment.isInterlockTarget && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20"
              title="인터락대상"
            >
              <span className="material-symbols-outlined text-orange-500" style={{ fontSize: 14 }}>
                lock
              </span>
              <span className="text-[10px] font-medium text-orange-500">LOCK</span>
            </div>
          )}
        </div>
      )}

      {/* 사업부 + 라인 + 위치 정보 */}
      <div className="space-y-1">
        {/* 사업부 */}
        {equipment.divisionCode && (
          <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-text-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              business
            </span>
            <span className="truncate">{equipment.divisionCode}</span>
          </div>
        )}

        {/* 라인 코드 */}
        {equipment.lineCode && (
          <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-text-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              view_timeline
            </span>
            <span className="truncate">{equipment.lineCode}</span>
          </div>
        )}

        {/* 위치 정보 */}
        {equipment.location && (
          <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-text-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              location_on
            </span>
            <span className="truncate">{equipment.location}</span>
          </div>
        )}
      </div>

      {/* 이미지 팝업 (버튼 클릭 시 표시) */}
      {showImagePopup && equipment.imageUrl && (
        <div className="absolute left-full top-0 ml-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-surface-dark border-2 border-primary rounded-lg shadow-2xl p-2 w-80">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-text dark:text-white">
                {equipment.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImagePopup(false);
                }}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  close
                </span>
              </button>
            </div>
            <img
              src={equipment.imageUrl}
              alt={equipment.name}
              className="w-full h-60 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "";
                (e.target as HTMLImageElement).alt = "이미지를 불러올 수 없습니다";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

EquipmentNode.displayName = "EquipmentNode";
