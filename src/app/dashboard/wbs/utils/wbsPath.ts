/**
 * @file src/app/dashboard/wbs/utils/wbsPath.ts
 * @description
 * WBS 항목이 어느 대 · 중 · 소분류 아래에 있는지(경로)를 구하는 함수입니다.
 *
 * 초보자 가이드:
 * 1. **wbsPath**: 최상위부터 그 항목까지의 항목 배열 (없으면 빈 배열)
 * 2. **pathLabel**: "1 업무 분석 › 1.3 소스 분석" 처럼 한 줄 글자로
 * 3. **flattenWbs**: 펼침과 관계없이 트리 순서대로 모든 항목
 */

import type { WbsItem } from "@/lib/api";

export function wbsPath(items: WbsItem[], id: string | null | undefined): WbsItem[] {
  if (!id) return [];
  for (const item of items) {
    if (item.id === id) return [item];
    const below = wbsPath(item.children ?? [], id);
    if (below.length > 0) return [item, ...below];
  }
  return [];
}

export const pathLabel = (path: WbsItem[]) => path.map((p) => `${p.code} ${p.name}`).join(" › ");

export function flattenWbs(items: WbsItem[]): WbsItem[] {
  return items.flatMap((item) => [item, ...flattenWbs(item.children ?? [])]);
}
