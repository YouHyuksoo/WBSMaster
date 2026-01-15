/**
 * @file src/app/dashboard/process-verification/components/ComparisonGrid.tsx
 * @description
 * 공정검증 항목을 사업부별로 비교하는 컴포넌트입니다.
 * 구분(category)과 관리코드 그룹(두 번째 '-' 전까지)으로 그룹화하고 각 사업부별 적용 여부(Y/N) 현황을 표시합니다.
 *
 * 초보자 가이드:
 * 1. **사업부 다중 선택**: 비교할 사업부를 선택
 * 2. **그룹화**: 구분 + 관리코드 그룹 기준 (예: "재료관리" + "M-1-01" → "재료관리_M-1")
 * 3. **집계 데이터**: 각 그룹의 Y/N 건수 및 사용율 표시
 */

"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui";
import { ProcessVerificationItem, verificationStatusConfig } from "../types";
import { BUSINESS_UNITS } from "@/constants/business-units";

interface ComparisonGridProps {
  /** 모든 공정검증 항목 */
  items: ProcessVerificationItem[];
  /** 선택된 사업부 목록 */
  selectedBusinessUnits: string[];
  /** 사업부 선택 변경 핸들러 */
  onBusinessUnitsChange: (units: string[]) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 구분 + 관리코드 그룹별 집계 데이터 타입
 * groupId: "재료관리_M-1" 형식
 * managementArea: "[재료관리] 자재 입고 (M-1)" 형식
 */
interface GroupData {
  groupId: string;
  managementArea: string;
  totalCount: number;
  /** 해당 그룹에 속한 모든 원본 항목들 */
  items: ProcessVerificationItem[];
  businessUnits: Record<
    string,
    {
      yes: number;
      no: number;
      usageRate: number;
    }
  >;
}

/**
 * 관리코드에서 첫 번째 '-' 전까지 + 두 번째 '-' 전까지 추출
 * 예: "M-1-01" → "M-1"
 */
function extractGroupCode(managementCode: string): string {
  const parts = managementCode.split("-");
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`; // 첫 번째와 두 번째 부분
  }
  return managementCode;
}

/**
 * 구분과 관리코드 그룹으로 전체 그룹 ID 생성
 * 예: "재료관리" + "M-1-01" → "재료관리_M-1"
 */
function createGroupId(category: string, managementCode: string): string {
  const groupCode = extractGroupCode(managementCode);
  return `${category}_${groupCode}`;
}

/**
 * 그룹 비교 보기 컴포넌트
 */
export default function ComparisonGrid({
  items,
  selectedBusinessUnits,
  onBusinessUnitsChange,
  isLoading,
}: ComparisonGridProps) {
  /** 상세보기 모달에 표시할 그룹 */
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<GroupData | null>(null);

  /**
   * 구분(category)과 관리코드 그룹(M-1, P-2 등)으로 그룹화하고 집계
   * 예: "재료관리_M-1" 그룹
   */
  const groupedData = useMemo(() => {
    if (selectedBusinessUnits.length === 0) {
      return [];
    }

    // 그룹 ID별로 그룹화 (구분_관리코드그룹)
    const groupMap = new Map<string, Map<string, ProcessVerificationItem[]>>();
    const groupLabelMap = new Map<string, string>(); // 그룹 ID → 표시 라벨

    items.forEach((item) => {
      const groupId = createGroupId(item.category, item.managementCode);
      const groupCode = extractGroupCode(item.managementCode);
      const label = `[${item.category}] ${item.managementArea} (${groupCode})`;

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, new Map<string, ProcessVerificationItem[]>());
        groupLabelMap.set(groupId, label);
      }

      const groupItems = groupMap.get(groupId)!;
      const businessUnit = item.businessUnit;
      if (!groupItems.has(businessUnit)) {
        groupItems.set(businessUnit, []);
      }

      groupItems.get(businessUnit)!.push(item);
    });

    // 선택된 사업부에 대한 집계 데이터 생성
    const result: GroupData[] = [];

    groupMap.forEach((businessUnitMap, groupId) => {
      // 이 그룹에 속한 모든 항목
      const itemsInGroup = Array.from(businessUnitMap.values()).flat();
      // 고유한 관리코드+세부항목 조합 수 (상세보기 행 수와 일치)
      const uniqueDetailItems = new Set(
        itemsInGroup.map((item) => `${item.managementCode}_${item.detailItem}`)
      );
      const totalCount = uniqueDetailItems.size;

      const businessUnitData: Record<
        string,
        {
          yes: number;
          no: number;
          usageRate: number;
        }
      > = {};

      selectedBusinessUnits.forEach((unit) => {
        const unitItems = businessUnitMap.get(unit) || [];
        const yesCount = unitItems.filter((item) => item.isApplied).length;
        const noCount = unitItems.filter((item) => !item.isApplied).length;
        const count = unitItems.length;

        businessUnitData[unit] = {
          yes: yesCount,
          no: noCount,
          usageRate: count > 0 ? Math.round((yesCount / count) * 100) : 0,
        };
      });

      result.push({
        groupId,
        managementArea: groupLabelMap.get(groupId) || groupId,
        totalCount,
        items: itemsInGroup, // 상세보기용 원본 항목들
        businessUnits: businessUnitData,
      });
    });

    // 그룹 ID로 정렬
    return result.sort((a, b) => a.groupId.localeCompare(b.groupId));
  }, [items, selectedBusinessUnits]);

  // 사업부 체크박스 토글
  const handleToggleBusinessUnit = (unit: string) => {
    if (selectedBusinessUnits.includes(unit)) {
      onBusinessUnitsChange(selectedBusinessUnits.filter((u) => u !== unit));
    } else {
      onBusinessUnitsChange([...selectedBusinessUnits, unit]);
    }
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedBusinessUnits.length === BUSINESS_UNITS.length) {
      onBusinessUnitsChange([]);
    } else {
      onBusinessUnitsChange([...BUSINESS_UNITS]);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 사업부 선택 영역 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="business" size="sm" className="text-primary" />
            <h3 className="font-semibold text-text dark:text-white">비교할 사업부 선택</h3>
          </div>
          <button
            onClick={handleSelectAll}
            className="text-xs px-2 py-1 rounded-md hover:bg-surface dark:hover:bg-background-dark text-primary transition-colors"
          >
            {selectedBusinessUnits.length === BUSINESS_UNITS.length ? "전체 해제" : "전체 선택"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {BUSINESS_UNITS.map((unit) => (
            <label
              key={unit}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark hover:border-primary/50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedBusinessUnits.includes(unit)}
                onChange={() => handleToggleBusinessUnit(unit)}
                className="w-4 h-4 text-primary rounded accent-primary"
              />
              <span className="text-sm font-medium text-text dark:text-white">{unit}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 그룹 비교 그리드 */}
      {selectedBusinessUnits.length > 0 ? (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
          {/* 헤더 */}
          <div
            className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase sticky top-0 min-w-fit"
            style={{
              gridTemplateColumns: `60px 280px 100px ${selectedBusinessUnits
                .map(() => "220px")
                .join(" ")}`,
            }}
          >
            <div className="text-center">상세</div>
            <div>관리영역</div>
            <div className="text-center">그룹총건수</div>
            {selectedBusinessUnits.map((unit) => (
              <div key={unit} className="text-center">
                {unit}
              </div>
            ))}
          </div>

          {/* 데이터 행 */}
          {groupedData.length > 0 ? (
            groupedData.map((group, idx) => (
              <div
                key={`${group.groupId}-${idx}`}
                className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-fit"
                style={{
                  gridTemplateColumns: `60px 280px 100px ${selectedBusinessUnits
                    .map(() => "220px")
                    .join(" ")}`,
                }}
              >
                {/* 상세보기 버튼 */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setSelectedGroupForDetail(group)}
                    className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                    title="상세보기"
                  >
                    <Icon name="visibility" size="sm" />
                  </button>
                </div>

                {/* 관리영역 */}
                <div className="text-sm font-medium text-text dark:text-white">
                  {group.managementArea}
                </div>

                {/* 그룹 총건수 */}
                <div className="text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                    {group.totalCount}건
                  </span>
                </div>

                {/* 사업부별 데이터 */}
                {selectedBusinessUnits.map((unit) => {
                  const data = group.businessUnits[unit];
                  if (!data) {
                    return (
                      <div
                        key={`${unit}-empty`}
                        className="text-center text-xs text-text-secondary"
                      >
                        -
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${unit}-${group.groupId}`}
                      className="flex items-center justify-center gap-2"
                    >
                      {/* Y/N 건수 표시 */}
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-success/10 text-success font-semibold text-xs">
                        Y <span>{data.yes}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-warning/10 text-warning font-semibold text-xs">
                        N <span>{data.no}</span>
                      </span>

                      {/* 진행상태바 */}
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className={`h-full transition-all ${
                            data.usageRate >= 75
                              ? "bg-success"
                              : data.usageRate >= 50
                                ? "bg-primary"
                                : data.usageRate >= 25
                                  ? "bg-warning"
                                  : "bg-error"
                          }`}
                          style={{ width: `${data.usageRate}%` }}
                        />
                      </div>

                      {/* 사용율 퍼센트 */}
                      <span className="text-xs font-semibold text-text dark:text-white min-w-[35px] text-right flex-shrink-0">
                        {data.usageRate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <Icon
                name="info"
                size="xl"
                className="text-text-secondary mb-4"
              />
              <p className="text-text-secondary">
                선택된 사업부에 데이터가 없습니다.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
          <Icon name="info" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">
            비교할 사업부를 선택하면 그룹 비교 그리드가 표시됩니다.
          </p>
        </div>
      )}

      {/* 상세보기 모달 */}
      {selectedGroupForDetail && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedGroupForDetail(null)}
          />
          {/* 모달 */}
          <div className="fixed inset-4 md:inset-10 lg:inset-20 bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark bg-surface dark:bg-background-dark">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="list_alt" size="sm" className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text dark:text-white">
                    그룹 상세보기
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {selectedGroupForDetail.managementArea}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGroupForDetail(null)}
                className="p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              >
                <Icon name="close" size="sm" className="text-text-secondary" />
              </button>
            </div>

            {/* 모달 통계 - 사업부별 요약 */}
            <div className="px-6 py-3 bg-surface/50 dark:bg-background-dark/50 border-b border-border dark:border-border-dark">
              <div className="flex flex-wrap gap-4">
                {selectedBusinessUnits.map((unit) => {
                  const unitItems = selectedGroupForDetail.items.filter((i) => i.businessUnit === unit);
                  const yesCount = unitItems.filter((i) => i.isApplied).length;
                  const noCount = unitItems.filter((i) => !i.isApplied).length;
                  return (
                    <div key={unit} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark">
                      <span className="text-xs font-semibold text-text dark:text-white">{unit}</span>
                      <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-xs font-semibold">Y:{yesCount}</span>
                      <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning text-xs font-semibold">N:{noCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 모달 본문 - 사업부별 비교 테이블 */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg overflow-hidden overflow-x-auto">
                {/* 테이블 헤더 - 관리코드, 세부항목, 세부검증, 수용여부 + 사업부별 컬럼 */}
                <div
                  className="grid gap-2 px-3 py-2 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase sticky top-0 min-w-fit"
                  style={{
                    gridTemplateColumns: `100px 200px 320px 150px ${selectedBusinessUnits.map(() => "100px").join(" ")}`,
                  }}
                >
                  <div>관리코드</div>
                  <div>세부항목</div>
                  <div>세부검증</div>
                  <div className="text-center">수용여부</div>
                  {selectedBusinessUnits.map((unit) => (
                    <div key={unit} className="text-center">{unit}</div>
                  ))}
                </div>

                {/* 테이블 본문 - 관리코드+세부항목 기준으로 그룹화 */}
                {(() => {
                  // 관리코드+세부항목으로 고유 행 생성
                  const rowMap = new Map<string, {
                    managementCode: string;
                    detailItem: string;
                    verificationDetail: string | null;
                    acceptanceStatus: string | null;
                    byUnit: Record<string, boolean | undefined>;
                  }>();

                  selectedGroupForDetail.items.forEach((item) => {
                    const rowKey = `${item.managementCode}_${item.detailItem}`;
                    if (!rowMap.has(rowKey)) {
                      rowMap.set(rowKey, {
                        managementCode: item.managementCode,
                        detailItem: item.detailItem,
                        verificationDetail: item.verificationDetail,
                        acceptanceStatus: item.acceptanceStatus,
                        byUnit: {},
                      });
                    }
                    rowMap.get(rowKey)!.byUnit[item.businessUnit] = item.isApplied;
                  });

                  const rows = Array.from(rowMap.values()).sort((a, b) =>
                    a.managementCode.localeCompare(b.managementCode) || a.detailItem.localeCompare(b.detailItem)
                  );

                  if (rows.length === 0) {
                    return (
                      <div className="p-8 text-center text-text-secondary">
                        항목이 없습니다.
                      </div>
                    );
                  }

                  return rows.map((row, idx) => (
                    <div
                      key={`${row.managementCode}-${row.detailItem}-${idx}`}
                      className="grid gap-2 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/50 dark:hover:bg-background-dark/50 transition-colors items-center text-sm min-w-fit"
                      style={{
                        gridTemplateColumns: `100px 200px 320px 150px ${selectedBusinessUnits.map(() => "100px").join(" ")}`,
                      }}
                    >
                      {/* 관리코드 */}
                      <div className="text-text dark:text-white font-medium truncate">
                        {row.managementCode}
                      </div>

                      {/* 세부항목 */}
                      <div className="text-text dark:text-white truncate" title={row.detailItem}>
                        {row.detailItem}
                      </div>

                      {/* 세부검증 */}
                      <div className="text-text-secondary truncate" title={row.verificationDetail || "-"}>
                        {row.verificationDetail || "-"}
                      </div>

                      {/* 수용여부 */}
                      <div className="flex justify-center">
                        {row.acceptanceStatus ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            row.acceptanceStatus === "수용" || row.acceptanceStatus === "Y"
                              ? "bg-success/10 text-success"
                              : row.acceptanceStatus === "미수용" || row.acceptanceStatus === "N"
                                ? "bg-error/10 text-error"
                                : "bg-slate-100 dark:bg-slate-700 text-text-secondary"
                          }`}>
                            {row.acceptanceStatus}
                          </span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </div>

                      {/* 사업부별 적용여부 */}
                      {selectedBusinessUnits.map((unit) => {
                        const isApplied = row.byUnit[unit];
                        if (isApplied === undefined) {
                          return (
                            <div key={unit} className="flex justify-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 text-xs font-semibold">
                                -
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div key={unit} className="flex justify-center">
                            <span
                              className={`px-3 py-0.5 rounded text-xs font-semibold ${
                                isApplied
                                  ? "bg-success/10 text-success"
                                  : "bg-warning/10 text-warning"
                              }`}
                            >
                              {isApplied ? "Y" : "N"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-3 border-t border-border dark:border-border-dark bg-surface dark:bg-background-dark flex justify-end">
              <button
                onClick={() => setSelectedGroupForDetail(null)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
