/**
 * @file src/app/dashboard/wbs/hooks/useWbsStats.ts
 * @description
 * WBS 통계를 계산하는 커스텀 훅입니다.
 * 엑셀 WBS 산식 기준으로 계획/실적 진척률을 계산합니다.
 *
 * 초보자 가이드:
 * 1. **말단 항목**: 자식이 없는 항목만 통계에 포함
 * 2. **가중치 기반**: 대분류 가중치 × 말단 평균 진행률
 * 3. **level1Details**: 대분류별 상세 데이터 (호버 툴팁용)
 */

"use client";

import { useMemo } from "react";
import type { WbsItem, Project } from "@/lib/api";
import type { WbsPageStats, ProjectScheduleStats } from "../types";
import { isDelayed, calculateProjectSchedule } from "../utils/wbsHelpers";

export function useWbsStats(wbsTree: WbsItem[], selectedProject: Project | null) {
  /** 통계 계산 (엑셀 WBS 산식 기준) */
  const stats: WbsPageStats = useMemo(() => {
    const leafItems: WbsItem[] = [];
    const collectLeafItems = (items: WbsItem[]) => {
      items.forEach((item) => {
        if (!item.children || item.children.length === 0) {
          leafItems.push(item);
        } else {
          collectLeafItems(item.children);
        }
      });
    };
    collectLeafItems(wbsTree);

    const total = leafItems.length;
    const completed = leafItems.filter((i) => i.status === "COMPLETED").length;
    const inProgress = leafItems.filter((i) => i.status === "IN_PROGRESS").length;
    const pending = leafItems.filter((i) => i.status === "PENDING").length;
    const delayed = leafItems.filter((i) => isDelayed(i.endDate, i.status, i.progress, i.actualEndDate)).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const level1Items = wbsTree.filter((item) => item.level === "LEVEL1");

    let plannedProgress = 0;
    let actualProgress = 0;
    let totalWeight = 0;

    const level1Details: WbsPageStats["level1Details"] = [];

    /** 말단 업무의 기간경과비율 계산 */
    const calcLeafPeriodProgress = (leaf: WbsItem): number => {
      const leafStart = leaf.startDate ? new Date(leaf.startDate) : null;
      const leafEnd = leaf.endDate ? new Date(leaf.endDate) : null;
      if (!leafStart || !leafEnd) return 0;
      leafStart.setHours(0, 0, 0, 0);
      leafEnd.setHours(0, 0, 0, 0);
      if (today < leafStart) return 0;
      if (today >= leafEnd) return 100;
      const totalMs = leafEnd.getTime() - leafStart.getTime();
      const elapsed = today.getTime() - leafStart.getTime();
      return totalMs > 0 ? (elapsed / totalMs) * 100 : 0;
    };

    level1Items.forEach((level1) => {
      const weight = level1.weight || 0;
      totalWeight += weight;

      const level1LeafItems: WbsItem[] = [];
      const collectLevel1Leaves = (items: WbsItem[]) => {
        items.forEach((item) => {
          if (!item.children || item.children.length === 0) {
            level1LeafItems.push(item);
          } else {
            collectLevel1Leaves(item.children);
          }
        });
      };
      collectLevel1Leaves([level1]);

      const avgProgressLevel1 = level1LeafItems.length > 0
        ? level1LeafItems.reduce((sum, i) => sum + i.progress, 0) / level1LeafItems.length
        : 0;

      const avgPeriodProgress = level1LeafItems.length > 0
        ? level1LeafItems.reduce((sum, i) => sum + calcLeafPeriodProgress(i), 0) / level1LeafItems.length
        : 0;

      const actualContrib = (weight * avgProgressLevel1) / 100;
      actualProgress += actualContrib;

      const plannedContrib = (weight * avgPeriodProgress) / 100;
      plannedProgress += plannedContrib;

      level1Details.push({
        name: level1.name,
        weight,
        leafCount: level1LeafItems.length,
        avgProgress: Math.round(avgProgressLevel1 * 10) / 10,
        avgPeriodProgress: Math.round(avgPeriodProgress * 10) / 10,
        plannedContrib: Math.round(plannedContrib * 100) / 100,
        actualContrib: Math.round(actualContrib * 100) / 100,
      });
    });

    plannedProgress = Math.round(plannedProgress * 10) / 10;
    actualProgress = Math.round(actualProgress * 10) / 10;

    const delayRate = Math.round((plannedProgress - actualProgress) * 10) / 10;
    const achievementRate = plannedProgress > 0
      ? Math.round((actualProgress / plannedProgress) * 100)
      : actualProgress > 0 ? 100 : 0;

    return {
      total,
      completed,
      inProgress,
      pending,
      delayed,
      plannedProgress,
      actualProgress,
      delayRate,
      achievementRate,
      totalWeight,
      level1Details,
    };
  }, [wbsTree]);

  /** 프로젝트 일정 통계 */
  const scheduleStats: ProjectScheduleStats | null = useMemo(() => {
    if (!selectedProject?.startDate || !selectedProject?.endDate) return null;
    return calculateProjectSchedule(selectedProject.startDate, selectedProject.endDate);
  }, [selectedProject]);

  return { stats, scheduleStats };
}
