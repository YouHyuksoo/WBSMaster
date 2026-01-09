/**
 * @file src/app/dashboard/wbs/utils/wbsHelpers.ts
 * @description
 * WBS 관련 헬퍼 함수들을 정의합니다.
 * 날짜 계산, 상태 판단, 트리 처리 등의 유틸리티 함수를 제공합니다.
 *
 * 초보자 가이드:
 * 1. **isDelayed**: 항목의 지연 여부 판단
 * 2. **getDelayDays**: 지연 일수 계산
 * 3. **calculateParentDates**: 하위 항목으로부터 상위 날짜 계산
 * 4. **applyCalculatedDates**: 트리 전체에 계산된 날짜 적용
 *
 * 수정 방법:
 * - 새로운 계산 로직 추가 시 이 파일에 함수 추가
 * - 기존 함수 수정 시 관련 컴포넌트 테스트 필요
 */

import type { WbsItem } from "@/lib/api";
import type { CalculatedDates, ProjectScheduleStats } from "../types";

/**
 * 지연 여부 판단
 * 종료일이 오늘보다 이전이고 완료/취소가 아니면 지연
 * @param endDate 종료일
 * @param status 현재 상태
 * @returns 지연 여부
 */
export const isDelayed = (
  endDate: string | null | undefined,
  status: string
): boolean => {
  if (!endDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return end < today;
};

/**
 * 지연 일수 계산
 * 종료일로부터 오늘까지 며칠 지연되었는지 반환
 * @param endDate 종료일
 * @param status 현재 상태
 * @returns 지연 일수 (지연 아니면 0)
 */
export const getDelayDays = (
  endDate: string | null | undefined,
  status: string
): number => {
  if (!endDate) return 0;
  if (status === "COMPLETED" || status === "CANCELLED") return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  if (end >= today) return 0;
  const diffTime = today.getTime() - end.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * 표시용 상태 결정 (지연 여부 반영)
 * @param status 원래 상태
 * @param endDate 종료일
 * @returns 표시할 상태 문자열
 */
export const getDisplayStatus = (
  status: string,
  endDate: string | null | undefined
): string => {
  if (isDelayed(endDate, status)) {
    return "DELAYED";
  }
  return status;
};

/**
 * 하위 항목들로부터 상위 항목의 시작일/종료일 계산
 * 재귀적으로 트리를 순회하며 계산된 일정을 반환
 * @param item WBS 항목
 * @returns 계산된 시작일/종료일
 */
export const calculateParentDates = (item: WbsItem): CalculatedDates => {
  // 자식이 없으면 자신의 날짜 반환
  if (!item.children || item.children.length === 0) {
    return {
      startDate: item.startDate || null,
      endDate: item.endDate || null,
    };
  }

  // 자식들의 날짜를 먼저 재귀적으로 계산
  const childDates = item.children.map((child) => calculateParentDates(child));

  // 유효한 시작일들 중 가장 빠른 날짜
  const validStartDates = childDates
    .map((d) => d.startDate)
    .filter((d): d is string => d !== null)
    .map((d) => new Date(d).getTime());

  // 유효한 종료일들 중 가장 늦은 날짜
  const validEndDates = childDates
    .map((d) => d.endDate)
    .filter((d): d is string => d !== null)
    .map((d) => new Date(d).getTime());

  const minStart =
    validStartDates.length > 0 ? Math.min(...validStartDates) : null;
  const maxEnd = validEndDates.length > 0 ? Math.max(...validEndDates) : null;

  return {
    startDate: minStart ? new Date(minStart).toISOString() : null,
    endDate: maxEnd ? new Date(maxEnd).toISOString() : null,
  };
};

/**
 * WBS 트리에 계산된 날짜를 적용 (상위 레벨은 하위로부터 계산)
 * @param items WBS 항목 배열
 * @returns 날짜가 적용된 항목 배열
 */
export const applyCalculatedDates = (items: WbsItem[]): WbsItem[] => {
  return items.map((item) => {
    // 자식이 있으면 먼저 자식들에 적용
    const updatedChildren =
      item.children && item.children.length > 0
        ? applyCalculatedDates(item.children)
        : item.children;

    // 자식이 있는 경우 (LEVEL1, LEVEL2, LEVEL3) 자식들로부터 날짜 계산
    if (updatedChildren && updatedChildren.length > 0) {
      const calculatedDates = calculateParentDates({
        ...item,
        children: updatedChildren,
      });
      return {
        ...item,
        children: updatedChildren,
        startDate: calculatedDates.startDate || item.startDate,
        endDate: calculatedDates.endDate || item.endDate,
      };
    }

    return { ...item, children: updatedChildren };
  });
};

/**
 * 작업일수 계산 (시작일 ~ 종료일)
 * @param startDate 시작일
 * @param endDate 종료일
 * @returns 작업일수 (null이면 계산 불가)
 */
export const calculateWorkDays = (
  startDate: string | null | undefined,
  endDate: string | null | undefined
): number | null => {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 시작일 포함
  return diffDays > 0 ? diffDays : 1;
};

/**
 * 프로젝트 일정 통계 계산
 * @param startDate 프로젝트 시작일
 * @param endDate 프로젝트 종료일
 * @returns 일정 통계 객체 (null이면 날짜 없음)
 */
export const calculateProjectSchedule = (
  startDate: string | null | undefined,
  endDate: string | null | undefined
): ProjectScheduleStats | null => {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 총 프로젝트 일수
  const totalDays =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // 휴무일수 (토/일) 계산
  let weekendDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  // 작업가능일수
  const workableDays = totalDays - weekendDays;

  // 경과일수
  let elapsedDays = 0;
  if (today >= start) {
    if (today >= end) {
      elapsedDays = totalDays;
    } else {
      elapsedDays =
        Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
    }
  }

  // 남은 일수
  let remainingDays = 0;
  if (today < end) {
    if (today < start) {
      remainingDays = totalDays;
    } else {
      remainingDays = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  return {
    totalDays,
    weekendDays,
    workableDays,
    elapsedDays,
    remainingDays,
  };
};

/**
 * OneDrive/SharePoint URL을 임베드 URL로 변환
 * @param url 원본 URL
 * @returns 임베드 가능한 URL
 */
export const getEmbedUrl = (url: string): string => {
  // OneDrive/SharePoint 공유 링크를 임베드 URL로 변환
  if (url.includes("sharepoint.com") || url.includes("onedrive.live.com")) {
    // 이미 임베드 URL이면 그대로 반환
    if (url.includes("embed")) {
      return url;
    }
    // 공유 URL을 임베드 URL로 변환
    return url.replace("?e=", "?embed=1&e=");
  }
  return url;
};

/**
 * 트리에서 모든 항목 ID 수집
 * @param items WBS 항목 배열
 * @returns 모든 ID 배열
 */
export const getAllItemIds = (items: WbsItem[]): string[] => {
  const ids: string[] = [];
  const traverse = (itemList: WbsItem[]) => {
    for (const item of itemList) {
      ids.push(item.id);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };
  traverse(items);
  return ids;
};

/**
 * 트리를 평탄화 (펼쳐진 항목만)
 * @param items WBS 항목 배열
 * @param expandedIds 펼쳐진 ID 집합
 * @returns 평탄화된 항목 배열
 */
export const flattenItems = (
  items: WbsItem[],
  expandedIds: Set<string>
): WbsItem[] => {
  const result: WbsItem[] = [];
  const traverse = (itemList: WbsItem[]) => {
    for (const item of itemList) {
      result.push(item);
      if (
        item.children &&
        item.children.length > 0 &&
        expandedIds.has(item.id)
      ) {
        traverse(item.children);
      }
    }
  };
  traverse(items);
  return result;
};

/**
 * 담당자 필터링 적용
 * 해당 담당자가 배정된 항목과 그 상위 경로를 유지
 * @param items WBS 항목 배열
 * @param assigneeId 담당자 ID
 * @returns 필터링된 항목 배열
 */
export const filterByAssignee = (
  items: WbsItem[],
  assigneeId: string
): WbsItem[] => {
  const filterTree = (itemList: WbsItem[]): WbsItem[] => {
    const result: WbsItem[] = [];

    for (const item of itemList) {
      // 자식이 있으면 먼저 자식들을 필터링
      const filteredChildren =
        item.children && item.children.length > 0
          ? filterTree(item.children)
          : undefined;

      // 이 항목의 담당자 ID들
      const itemAssigneeIds = item.assignees?.map((a) => a.id) || [];

      // 담당자가 일치하거나 필터링된 자식이 있으면 포함
      const matchesAssignee = itemAssigneeIds.includes(assigneeId);
      const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

      if (matchesAssignee || hasMatchingChildren) {
        result.push({
          ...item,
          children: filteredChildren,
        });
      }
    }

    return result;
  };

  return filterTree(items);
};

/**
 * WBS 통계 계산
 * @param items WBS 항목 배열
 * @returns 통계 객체
 */
export const calculateWbsStats = (items: WbsItem[]) => {
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let delayed = 0;
  let totalProgress = 0;
  let totalWeight = 0;

  const traverse = (itemList: WbsItem[]) => {
    for (const item of itemList) {
      // LEVEL4만 집계 (단위업무)
      if (item.level === "LEVEL4") {
        total++;
        totalProgress += item.progress * (item.weight || 1);
        totalWeight += item.weight || 1;

        if (item.status === "COMPLETED") {
          completed++;
        } else if (item.status === "IN_PROGRESS") {
          inProgress++;
          if (isDelayed(item.endDate, item.status)) {
            delayed++;
          }
        } else if (item.status === "PENDING") {
          pending++;
          if (isDelayed(item.endDate, item.status)) {
            delayed++;
          }
        }
      }

      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(items);

  return {
    total,
    completed,
    inProgress,
    pending,
    delayed,
    overallProgress: totalWeight > 0 ? totalProgress / totalWeight : 0,
  };
};
