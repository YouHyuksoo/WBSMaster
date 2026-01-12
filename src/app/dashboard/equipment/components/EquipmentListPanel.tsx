/**
 * @file src/app/dashboard/equipment/components/EquipmentListPanel.tsx
 * @description
 * 좌측 설비 목록 패널 컴포넌트
 * 등록된 설비 목록을 표시하고 검색/필터 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **설비 목록**: 전체 설비를 코드, 이름, 상태와 함께 표시
 * 2. **검색**: 설비명으로 필터링
 * 3. **상태 필터**: 특정 상태의 설비만 표시
 * 4. **클릭**: 설비 클릭 시 캔버스에서 선택
 *
 * 수정 방법:
 * - 정렬 추가: sortedEquipments 로직 수정
 * - 그룹화 추가: 타입별, 위치별 등으로 그룹화
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [lineFilter, setLineFilter] = useState<string>("ALL");
  const [divisionFilter, setDivisionFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
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

  // 고유 값 목록 추출
  const uniqueTypes = useMemo(
    () => Array.from(new Set(equipments.map((eq) => eq.type))),
    [equipments]
  );
  const uniqueLines = useMemo(
    () => Array.from(new Set(equipments.map((eq) => eq.lineCode).filter((x): x is string => Boolean(x)))),
    [equipments]
  );
  const uniqueDivisions = useMemo(
    () => Array.from(new Set(equipments.map((eq) => eq.divisionCode).filter((x): x is string => Boolean(x)))),
    [equipments]
  );
  const uniqueLocations = useMemo(
    () => Array.from(new Set(equipments.map((eq) => eq.location).filter((x): x is string => Boolean(x)))),
    [equipments]
  );

  // 필터링 및 정렬
  const filteredEquipments = useMemo(() => {
    let result = equipments;

    // 검색 필터
    if (search) {
      result = result.filter(
        (eq) =>
          eq.name.toLowerCase().includes(search.toLowerCase()) ||
          eq.code.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 상태 필터
    if (statusFilter !== "ALL") {
      result = result.filter((eq) => eq.status === statusFilter);
    }

    // 타입 필터
    if (typeFilter !== "ALL") {
      result = result.filter((eq) => eq.type === typeFilter);
    }

    // 라인 필터
    if (lineFilter !== "ALL") {
      result = result.filter((eq) => eq.lineCode === lineFilter);
    }

    // 사업부 필터
    if (divisionFilter !== "ALL") {
      result = result.filter((eq) => eq.divisionCode === divisionFilter);
    }

    // 위치 필터
    if (locationFilter !== "ALL") {
      result = result.filter((eq) => eq.location === locationFilter);
    }

    // 코드순 정렬
    return result.sort((a, b) => a.code.localeCompare(b.code));
  }, [equipments, search, statusFilter, typeFilter, lineFilter, divisionFilter, locationFilter]);

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-text dark:text-white">설비 목록</h2>
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

        {/* 검색 */}
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" style={{ fontSize: 18 }}>
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="설비명 또는 코드 검색"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 필터 그리드 (2열 배치) */}
        <div className="grid grid-cols-2 gap-2">
          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | "ALL")}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">전체 상태 ({equipments.length})</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label} ({stats[key as EquipmentStatus]})
              </option>
            ))}
          </select>

          {/* 타입 필터 */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">전체 타입</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]?.label || type}
              </option>
            ))}
          </select>

          {/* 라인 필터 */}
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">전체 라인</option>
            {uniqueLines.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>

          {/* 사업부 필터 */}
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">전체 사업부</option>
            {uniqueDivisions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>

          {/* 위치 필터 */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary col-span-2"
          >
            <option value="ALL">전체 위치</option>
            {uniqueLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 설비 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filteredEquipments.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-text-secondary mb-2" style={{ fontSize: 48 }}>
              inventory_2
            </span>
            <p className="text-sm text-text-secondary">
              {search || statusFilter !== "ALL"
                ? "검색 결과가 없습니다."
                : "등록된 설비가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="p-2 grid grid-cols-2 gap-2">
            {filteredEquipments.map((equipment) => {
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
