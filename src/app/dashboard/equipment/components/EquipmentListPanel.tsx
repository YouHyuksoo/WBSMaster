/**
 * @file src/app/dashboard/equipment/components/EquipmentListPanel.tsx
 * @description
 * 좌측 설비 목록 패널 컴포넌트
 * 등록된 설비 목록을 표시합니다. (필터는 상단 필터바에서 처리)
 *
 * 초보자 가이드:
 * 1. **설비 목록**: 설비를 코드, 이름, 상태와 함께 표시
 * 2. **드래그**: 설비를 캔버스로 드래그하여 배치
 * 3. **클릭**: 설비 클릭 시 캔버스에서 선택
 */

"use client";

import { useMemo, useRef, useEffect } from "react";
import { Equipment, EquipmentStatus } from "@/lib/api";
import { STATUS_CONFIG, TYPE_CONFIG } from "../types";

/** Props 타입 */
interface EquipmentListPanelProps {
  equipments: Equipment[];
  selectedId: string | null;
  onSelectEquipment: (id: string) => void;
  onClose?: () => void;
}

/**
 * 설비 목록 패널 컴포넌트
 */
export function EquipmentListPanel({
  equipments,
  selectedId,
  onSelectEquipment,
  onClose,
}: EquipmentListPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    if (!onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 약간의 딜레이 후 이벤트 리스너 추가 (패널 열림 애니메이션 후)
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // 코드순 정렬
  const sortedEquipments = useMemo(() => {
    return [...equipments].sort((a, b) => a.code.localeCompare(b.code));
  }, [equipments]);

  // 상태별 통계
  const stats = useMemo(() => {
    const counts: Record<EquipmentStatus, number> = {
      ACTIVE: 0,
      MAINTENANCE: 0,
      INACTIVE: 0,
      BROKEN: 0,
      RESERVED: 0,
    };

    equipments.forEach((eq) => {
      counts[eq.status]++;
    });

    return counts;
  }, [equipments]);

  return (
    <div
      ref={panelRef}
      className="w-96 border-r border-border dark:border-border-dark bg-background-white dark:bg-surface-dark flex flex-col h-full"
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border dark:border-border-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text dark:text-white">설비 목록</h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {equipments.length}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text dark:hover:text-white transition-colors"
              title="패널 닫기"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                chevron_left
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 설비 목록 */}
      <div className="flex-1 overflow-y-auto">
        {sortedEquipments.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-text-secondary mb-2" style={{ fontSize: 48 }}>
              inventory_2
            </span>
            <p className="text-sm text-text-secondary">
              등록된 설비가 없습니다.
            </p>
          </div>
        ) : (
          <div className="p-2 grid grid-cols-2 gap-2">
            {sortedEquipments.map((equipment) => {
              const statusInfo = STATUS_CONFIG[equipment.status];
              const typeInfo = TYPE_CONFIG[equipment.type];
              const isSelected = selectedId === equipment.id;

              return (
                <button
                  key={equipment.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/equipment", equipment.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onSelectEquipment(equipment.id)}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing
                    ${isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border dark:border-border-dark hover:border-primary/50 hover:bg-surface dark:hover:bg-background-dark"
                    }
                  `}
                >
                  {/* 상단: 코드 + 타입 아이콘 + 상태 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-secondary">
                        {equipment.code}
                      </span>
                      {/* 타입 아이콘 */}
                      <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>
                          {typeInfo.icon}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusInfo.bgColor}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {statusInfo.icon}
                      </span>
                      <span className={`text-[10px] font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* 설비명 */}
                  <h3 className="text-sm font-semibold text-text dark:text-white mb-2 truncate">
                    {equipment.name}
                  </h3>

                  {/* 하단: 사업부 / 라인 / 위치 (아이콘 포함) */}
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary flex-wrap">
                    {equipment.divisionCode && (
                      <div className="flex items-center gap-1 bg-surface dark:bg-background-dark px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          business
                        </span>
                        <span className="truncate">{equipment.divisionCode}</span>
                      </div>
                    )}
                    {equipment.lineCode && (
                      <div className="flex items-center gap-1 bg-surface dark:bg-background-dark px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          linear_scale
                        </span>
                        <span className="truncate">{equipment.lineCode}</span>
                      </div>
                    )}
                    {equipment.location && (
                      <div className="flex items-center gap-1 bg-surface dark:bg-background-dark px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          location_on
                        </span>
                        <span className="truncate">{equipment.location}</span>
                      </div>
                    )}
                    {!equipment.divisionCode && !equipment.lineCode && !equipment.location && (
                      <span className="text-text-secondary/50 italic">정보 없음</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 통계 */}
      <div className="p-4 border-t border-border dark:border-border-dark">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-success"></div>
            <span className="text-text-secondary">가동: {stats.ACTIVE}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-warning"></div>
            <span className="text-text-secondary">정비: {stats.MAINTENANCE}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-error"></div>
            <span className="text-text-secondary">고장: {stats.BROKEN}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-slate-400"></div>
            <span className="text-text-secondary">휴지: {stats.INACTIVE}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
