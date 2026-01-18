/**
 * @file src/app/dashboard/process-verification/components/ComparisonGrid.tsx
 * @description
 * 공정검증 마스터의 사업부별 적용 현황을 비교하는 컴포넌트입니다.
 *
 * 2026-01-17 구조 개선:
 * - 마스터 + 사업부별 적용(ProcessVerificationBusinessUnit) 구조에 맞게 수정
 * - 제품유형(SMD/HANES)별로 분리하여 해당 사업부만 표시
 * - 관리영역(L1) 기준으로 그룹화하여 사업부별 적용 건수 비교
 *
 * 초보자 가이드:
 * 1. **제품유형 선택**: SMD(V_IVI, V_DISP, V_PCBA) 또는 HANES(V_HMS)
 * 2. **그룹화**: 관리영역(L1) 기준으로 마스터를 그룹화
 * 3. **집계 데이터**: 각 그룹의 사업부별 적용(Y) 건수 표시
 */

"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui";
import {
  ProcessVerificationMaster,
  PRODUCT_TYPES,
  ProductType,
} from "../types";
import { PRODUCT_TYPE_BUSINESS_UNITS } from "@/constants/business-units";

interface ComparisonGridProps {
  /** 모든 공정검증 마스터 */
  items: ProcessVerificationMaster[];
  /** 선택된 사업부 목록 (부모에서 관리) */
  selectedBusinessUnits: string[];
  /** 사업부 선택 변경 핸들러 */
  onBusinessUnitsChange: (units: string[]) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 관리영역(L1)별 집계 데이터 타입
 */
interface GroupData {
  /** 관리영역명 */
  managementArea: string;
  /** 카테고리(구분) */
  category: string;
  /** 해당 그룹의 마스터 총 개수 */
  totalCount: number;
  /** 해당 그룹에 속한 마스터들 */
  masters: ProcessVerificationMaster[];
  /** 사업부별 적용 현황 */
  businessUnits: Record<
    string,
    {
      applied: number;   // 적용(Y) 건수
      notApplied: number; // 미적용(N) 건수
      usageRate: number;  // 적용률(%)
    }
  >;
}

/** 페이지 사이즈 옵션 */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * 그룹 비교 보기 컴포넌트
 */
export default function ComparisonGrid({
  items,
  isLoading,
}: ComparisonGridProps) {
  /** 선택된 제품유형 */
  const [selectedProductType, setSelectedProductType] = useState<ProductType>("SMD");
  /** 상세보기 모달에 표시할 그룹 */
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<GroupData | null>(null);
  /** 현재 페이지 (1부터 시작) */
  const [currentPage, setCurrentPage] = useState(1);
  /** 페이지 사이즈 */
  const [pageSize, setPageSize] = useState<number>(20);

  /**
   * 선택된 제품유형에 해당하는 사업부 목록
   * readonly 배열을 일반 배열로 변환
   */
  const availableBusinessUnits = useMemo(() => {
    const units = PRODUCT_TYPE_BUSINESS_UNITS[selectedProductType];
    return units ? [...units] : [];
  }, [selectedProductType]);

  /**
   * 선택된 제품유형의 마스터만 필터링
   */
  const filteredMasters = useMemo(() => {
    return items.filter((master) => master.productType === selectedProductType);
  }, [items, selectedProductType]);

  /**
   * 관리영역(L1)별로 그룹화하고 사업부별 적용 현황 집계
   */
  const groupedData = useMemo(() => {
    if (filteredMasters.length === 0) {
      return [];
    }

    // 관리영역별로 마스터 그룹화
    const groupMap = new Map<string, ProcessVerificationMaster[]>();

    filteredMasters.forEach((master) => {
      const key = `${master.category}_${master.managementArea}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(master);
    });

    // 그룹별 집계 데이터 생성
    const result: GroupData[] = [];

    groupMap.forEach((mastersInGroup, key) => {
      const [category, managementArea] = key.split("_");
      const totalCount = mastersInGroup.length;

      // 사업부별 적용 현황 집계
      const businessUnitData: GroupData["businessUnits"] = {};

      availableBusinessUnits.forEach((unit) => {
        let appliedCount = 0;
        let notAppliedCount = 0;

        mastersInGroup.forEach((master) => {
          const apply = master.businessUnitApplies?.find(
            (a) => a.businessUnit === unit
          );
          if (apply) {
            if (apply.isApplied) {
              appliedCount++;
            } else {
              notAppliedCount++;
            }
          } else {
            // businessUnitApplies에 해당 사업부 데이터가 없으면 미적용으로 간주
            notAppliedCount++;
          }
        });

        const total = appliedCount + notAppliedCount;
        businessUnitData[unit] = {
          applied: appliedCount,
          notApplied: notAppliedCount,
          usageRate: total > 0 ? Math.round((appliedCount / total) * 100) : 0,
        };
      });

      result.push({
        managementArea,
        category,
        totalCount,
        masters: mastersInGroup,
        businessUnits: businessUnitData,
      });
    });

    // 카테고리 → 관리영역 순으로 정렬
    return result.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category);
      if (catCompare !== 0) return catCompare;
      return a.managementArea.localeCompare(b.managementArea);
    });
  }, [filteredMasters, availableBusinessUnits]);

  /**
   * 전체 통계 계산
   */
  const totalStats = useMemo(() => {
    const stats: Record<string, { applied: number; notApplied: number; total: number }> = {};

    availableBusinessUnits.forEach((unit) => {
      stats[unit] = { applied: 0, notApplied: 0, total: 0 };
    });

    filteredMasters.forEach((master) => {
      availableBusinessUnits.forEach((unit) => {
        const apply = master.businessUnitApplies?.find((a) => a.businessUnit === unit);
        stats[unit].total++;
        if (apply?.isApplied) {
          stats[unit].applied++;
        } else {
          stats[unit].notApplied++;
        }
      });
    });

    return stats;
  }, [filteredMasters, availableBusinessUnits]);

  /**
   * 페이지네이션 계산
   */
  const totalPages = Math.ceil(groupedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = groupedData.slice(startIndex, endIndex);

  /**
   * 제품유형 변경 시 페이지 리셋
   */
  const handleProductTypeChange = (type: ProductType) => {
    setSelectedProductType(type);
    setCurrentPage(1);
  };

  /**
   * 페이지 사이즈 변경 핸들러
   */
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  /**
   * 페이지 번호 배열 생성 (최대 5개 표시)
   */
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
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
      {/* 제품유형 선택 탭 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="category" size="sm" className="text-primary" />
            <h3 className="font-semibold text-text dark:text-white">제품유형 선택</h3>
          </div>
          <div className="text-xs text-text-secondary">
            마스터 총 {filteredMasters.length}건
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-surface dark:bg-background-dark rounded-lg w-fit">
          {PRODUCT_TYPES.map((type) => {
            const count = items.filter((m) => m.productType === type).length;
            const businessUnits = PRODUCT_TYPE_BUSINESS_UNITS[type] || [];
            return (
              <button
                key={type}
                onClick={() => handleProductTypeChange(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedProductType === type
                    ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                    : "text-text-secondary hover:text-text dark:hover:text-white"
                }`}
              >
                <span>{type}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    selectedProductType === type
                      ? "bg-primary/10 text-primary"
                      : "bg-surface dark:bg-background-dark"
                  }`}
                >
                  {count}건
                </span>
                <span className="text-[10px] text-text-secondary">
                  ({businessUnits.join(", ")})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 그룹 비교 테이블 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
        {/* 헤더 */}
        <div
          className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase sticky top-0 min-w-fit"
          style={{
            gridTemplateColumns: `50px 150px 1fr 80px ${availableBusinessUnits
              .map(() => "180px")
              .join(" ")}`,
          }}
        >
          <div className="text-center">상세</div>
          <div>구분</div>
          <div>관리영역</div>
          <div className="text-center">마스터</div>
          {availableBusinessUnits.map((unit) => (
            <div key={unit} className="text-center">
              {unit}
            </div>
          ))}
        </div>

        {/* 데이터 행 */}
        {paginatedData.length > 0 ? (
          paginatedData.map((group, idx) => (
            <div
              key={`${group.category}-${group.managementArea}-${idx}`}
              className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-fit"
              style={{
                gridTemplateColumns: `50px 150px 1fr 80px ${availableBusinessUnits
                  .map(() => "180px")
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

              {/* 구분 */}
              <div className="text-sm text-text-secondary truncate" title={group.category}>
                {group.category}
              </div>

              {/* 관리영역 */}
              <div className="text-sm font-medium text-text dark:text-white truncate" title={group.managementArea}>
                {group.managementArea}
              </div>

              {/* 마스터 건수 */}
              <div className="text-center">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                  {group.totalCount}건
                </span>
              </div>

              {/* 사업부별 적용 현황 */}
              {availableBusinessUnits.map((unit) => {
                const data = group.businessUnits[unit];
                if (!data) {
                  return (
                    <div key={unit} className="text-center text-xs text-text-secondary">
                      -
                    </div>
                  );
                }

                return (
                  <div key={unit} className="flex items-center justify-center gap-2">
                    {/* Y/N 건수 */}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-success/10 text-success font-semibold text-xs">
                      Y <span>{data.applied}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-text-secondary font-semibold text-xs">
                      N <span>{data.notApplied}</span>
                    </span>

                    {/* 진행상태바 */}
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full transition-all rounded-full ${
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

                    {/* 적용률 */}
                    <span className="text-xs font-semibold text-text dark:text-white min-w-[30px] text-right">
                      {data.usageRate}%
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
            <p className="text-text-secondary">
              {selectedProductType} 제품유형의 마스터 데이터가 없습니다.
            </p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {groupedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl">
          {/* 좌측: 페이지 정보 및 사이즈 선택 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">
              총 <span className="font-semibold text-text dark:text-white">{groupedData.length}</span>개 그룹 중{" "}
              <span className="font-semibold text-primary">{startIndex + 1}</span>-
              <span className="font-semibold text-primary">{Math.min(endIndex, groupedData.length)}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">페이지당</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 rounded-md bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}개
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 우측: 페이지 네비게이션 */}
          <div className="flex items-center gap-1">
            {/* 처음 페이지 */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-md transition-colors ${
                currentPage === 1
                  ? "text-text-secondary/50 cursor-not-allowed"
                  : "text-text-secondary hover:text-primary hover:bg-primary/10"
              }`}
              title="처음"
            >
              <Icon name="first_page" size="sm" />
            </button>

            {/* 이전 페이지 */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-md transition-colors ${
                currentPage === 1
                  ? "text-text-secondary/50 cursor-not-allowed"
                  : "text-text-secondary hover:text-primary hover:bg-primary/10"
              }`}
              title="이전"
            >
              <Icon name="chevron_left" size="sm" />
            </button>

            {/* 페이지 번호 */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:text-primary hover:bg-primary/10"
                }`}
              >
                {page}
              </button>
            ))}

            {/* 다음 페이지 */}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-md transition-colors ${
                currentPage === totalPages || totalPages === 0
                  ? "text-text-secondary/50 cursor-not-allowed"
                  : "text-text-secondary hover:text-primary hover:bg-primary/10"
              }`}
              title="다음"
            >
              <Icon name="chevron_right" size="sm" />
            </button>

            {/* 마지막 페이지 */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-md transition-colors ${
                currentPage === totalPages || totalPages === 0
                  ? "text-text-secondary/50 cursor-not-allowed"
                  : "text-text-secondary hover:text-primary hover:bg-primary/10"
              }`}
              title="마지막"
            >
              <Icon name="last_page" size="sm" />
            </button>
          </div>
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
                    [{selectedGroupForDetail.category}] {selectedGroupForDetail.managementArea}
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
                {availableBusinessUnits.map((unit) => {
                  const data = selectedGroupForDetail.businessUnits[unit];
                  return (
                    <div
                      key={unit}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark"
                    >
                      <span className="text-xs font-semibold text-text dark:text-white">{unit}</span>
                      <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-xs font-semibold">
                        Y:{data?.applied || 0}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-text-secondary text-xs font-semibold">
                        N:{data?.notApplied || 0}
                      </span>
                      <span className={`text-xs font-bold ${
                        (data?.usageRate || 0) >= 50 ? "text-success" : "text-warning"
                      }`}>
                        {data?.usageRate || 0}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 모달 본문 - 마스터별 상세 테이블 */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg overflow-hidden overflow-x-auto">
                {/* 테이블 헤더 */}
                <div
                  className="grid gap-2 px-3 py-2 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase sticky top-0 min-w-fit"
                  style={{
                    gridTemplateColumns: `100px 250px 1fr 100px ${availableBusinessUnits
                      .map(() => "80px")
                      .join(" ")}`,
                  }}
                >
                  <div>관리코드</div>
                  <div>세부항목</div>
                  <div>세부검증</div>
                  <div className="text-center">수용여부</div>
                  {availableBusinessUnits.map((unit) => (
                    <div key={unit} className="text-center">
                      {unit}
                    </div>
                  ))}
                </div>

                {/* 테이블 본문 */}
                {selectedGroupForDetail.masters.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">
                    항목이 없습니다.
                  </div>
                ) : (
                  selectedGroupForDetail.masters.map((master, idx) => (
                    <div
                      key={`${master.id}-${idx}`}
                      className="grid gap-2 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/50 dark:hover:bg-background-dark/50 transition-colors items-center text-sm min-w-fit"
                      style={{
                        gridTemplateColumns: `100px 250px 1fr 100px ${availableBusinessUnits
                          .map(() => "80px")
                          .join(" ")}`,
                      }}
                    >
                      {/* 관리코드 */}
                      <div className="text-text dark:text-white font-medium truncate">
                        {master.managementCode}
                      </div>

                      {/* 세부항목 */}
                      <div
                        className="text-text dark:text-white truncate"
                        title={master.detailItem}
                      >
                        {master.detailItem}
                      </div>

                      {/* 세부검증 */}
                      <div
                        className="text-text-secondary truncate"
                        title={master.verificationDetail || "-"}
                      >
                        {master.verificationDetail || "-"}
                      </div>

                      {/* 수용여부 */}
                      <div className="flex justify-center">
                        {master.acceptanceStatus ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              master.acceptanceStatus === "수용" ||
                              master.acceptanceStatus === "Y"
                                ? "bg-success/10 text-success"
                                : master.acceptanceStatus === "미수용" ||
                                    master.acceptanceStatus === "N"
                                  ? "bg-error/10 text-error"
                                  : "bg-slate-100 dark:bg-slate-700 text-text-secondary"
                            }`}
                          >
                            {master.acceptanceStatus}
                          </span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </div>

                      {/* 사업부별 적용여부 */}
                      {availableBusinessUnits.map((unit) => {
                        const apply = master.businessUnitApplies?.find(
                          (a) => a.businessUnit === unit
                        );
                        const isApplied = apply?.isApplied;

                        return (
                          <div key={unit} className="flex justify-center">
                            <span
                              className={`px-3 py-0.5 rounded text-xs font-semibold ${
                                isApplied
                                  ? "bg-success/10 text-success"
                                  : "bg-slate-100 dark:bg-slate-700 text-text-secondary"
                              }`}
                            >
                              {isApplied ? "Y" : "N"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
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
