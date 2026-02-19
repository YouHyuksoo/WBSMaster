/**
 * @file src/app/dashboard/wbs/hooks/useWbsTree.ts
 * @description
 * WBS 트리 펼침/접기, 체크 상태, 평탄화를 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **expandedIds**: 펼쳐진 항목 ID 집합
 * 2. **checkedIds**: 체크된 항목 ID 집합 (일괄 배정용)
 * 3. **visibleItems**: 펼침 상태에 따라 평탄화된 항목 배열
 */

"use client";

import { useState, useMemo } from "react";
import type { WbsItem } from "@/lib/api";

export function useWbsTree(wbsTree: WbsItem[]) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  /** 트리를 평탄화하여 모든 항목 ID 수집 */
  const getAllItemIds = (items: WbsItem[]): string[] => {
    const ids: string[] = [];
    const collect = (list: WbsItem[]) => {
      list.forEach((item) => {
        ids.push(item.id);
        if (item.children) collect(item.children);
      });
    };
    collect(items);
    return ids;
  };

  /** 모든 항목을 평탄화 (트리 펼침 상태와 동기화) */
  const visibleItems = useMemo(() => {
    const result: WbsItem[] = [];
    const traverse = (list: WbsItem[]) => {
      list.forEach((item) => {
        result.push(item);
        if (item.children && expandedIds.has(item.id)) {
          traverse(item.children);
        }
      });
    };
    traverse(wbsTree);
    return result;
  }, [wbsTree, expandedIds]);

  /** 항목 확장/축소 토글 */
  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** 전체 확장 */
  const handleExpandAll = () => {
    const allIds: string[] = [];
    const collectIds = (items: WbsItem[]) => {
      items.forEach((item) => {
        allIds.push(item.id);
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(wbsTree);
    setExpandedIds(new Set(allIds));
  };

  /** 전체 축소 */
  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  /** 2레벨까지 펼치기 (LEVEL1만 펼침 → LEVEL2가 보임) */
  const handleExpandLevel2 = () => {
    const level1Ids: string[] = [];
    wbsTree.forEach((item) => {
      if (item.level === "LEVEL1") {
        level1Ids.push(item.id);
      }
    });
    setExpandedIds(new Set(level1Ids));
  };

  /** 체크박스 토글 */
  const handleCheck = (id: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  /** 전체 선택/해제 */
  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      const allIds = getAllItemIds(wbsTree);
      setCheckedIds(new Set(allIds));
    } else {
      setCheckedIds(new Set());
    }
  };

  return {
    expandedIds,
    setExpandedIds,
    checkedIds,
    setCheckedIds,
    visibleItems,
    handleToggle,
    handleExpandAll,
    handleCollapseAll,
    handleExpandLevel2,
    handleCheck,
    handleCheckAll,
    getAllItemIds,
  };
}
