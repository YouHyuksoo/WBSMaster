/**
 * @file src/app/dashboard/progress-risk/components/LoadTab/LoadHeatmap.tsx
 * @description user × week 부하 매트릭스 시각화 (히트맵)
 *
 * 초보자 가이드:
 * 1. **cellColor**: 참여율 % 기반 색상 (정상/주의/과부하)
 * 2. **테이블 헤더**: 사용자명 + 주차별 날짜
 * 3. **테이블 바디**: 각 셀의 높이 = min(pct, 100)%로 시각화
 * 4. **범례**: 색상 의미 설명 (70%, 100%)
 */

import { format } from "date-fns";
import type { UserLoad } from "./loadBuckets";

interface Props {
  loads: UserLoad[];
}

/**
 * 참여율(%)에 따른 셀 배경색
 * - 0%: 회색 (할당 없음)
 * - 1~70%: 초록 (정상)
 * - 70~100%: 주황 (주의)
 * - 100%↑: 빨강 (과부하)
 */
function cellColor(pct: number): string {
  if (pct > 100) return "bg-error";
  if (pct >= 70) return "bg-warning";
  if (pct > 0) return "bg-success";
  return "bg-white/5 dark:bg-white/5";
}

export function LoadHeatmap({ loads }: Props) {
  // 빈 상태 처리
  if (loads.length === 0) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
        <p className="text-text-secondary">담당자가 할당된 task가 없습니다.</p>
      </div>
    );
  }

  // Step 1: 모든 사용자의 주차 키를 union하고 정렬
  const allWeekKeys = new Set<string>();
  for (const load of loads) {
    for (const w of load.weeks) {
      allWeekKeys.add(w.key);
    }
  }
  const weekKeysSorted = [...allWeekKeys].sort();

  // Step 2: 주차 키 → 날짜 맵 구성 (헤더에서 날짜 표시용)
  const weekDateMap = new Map<string, Date>();
  for (const load of loads) {
    for (const w of load.weeks) {
      if (!weekDateMap.has(w.key)) {
        weekDateMap.set(w.key, w.date);
      }
    }
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        {/* 테이블 헤더: 사용자명 + 주차 */}
        <thead>
          <tr>
            <th className="text-left text-text-secondary uppercase pb-2 pr-3 min-w-[140px] font-semibold">
              담당자
            </th>
            {weekKeysSorted.map((wk) => {
              const d = weekDateMap.get(wk)!;
              return (
                <th
                  key={wk}
                  className="text-text-secondary text-[9px] pb-2 px-1 whitespace-nowrap font-normal"
                >
                  {format(d, "MM/dd")}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* 테이블 바디: user × week 셀 */}
        <tbody>
          {loads.map((load) => {
            // 이 user의 주차별 데이터를 맵으로 빠른 접근
            const byKey = new Map(load.weeks.map((w) => [w.key, w]));

            return (
              <tr
                key={load.userId}
                className="border-t border-border/30 dark:border-border-dark/30"
              >
                {/* 사용자명 */}
                <td className="text-text dark:text-white py-2 pr-3 whitespace-nowrap font-medium">
                  {load.userName}
                </td>

                {/* 각 주차별 부하 셀 */}
                {weekKeysSorted.map((wk) => {
                  const bucket = byKey.get(wk);
                  const pct = bucket?.sumPct ?? 0;
                  const heightPct = Math.min(100, pct); // 시각화는 최대 100%

                  return (
                    <td key={wk} className="px-1 py-1.5">
                      <div
                        className="relative h-4 w-6 bg-white/5 dark:bg-white/5 rounded-sm overflow-hidden border border-white/10 dark:border-white/10"
                        title={`${pct}%`}
                      >
                        {/* 부하 비율 막대 */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${cellColor(pct)} rounded-sm transition-all`}
                          style={{ height: `${heightPct}%` }}
                        />

                        {/* 과부하 표시 (100% 초과 시) */}
                        {pct > 100 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white font-bold">
                            !
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 범례 */}
      <div className="flex gap-4 mt-4 text-[10px] text-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-success rounded-sm" />
          <span>정상 ≤70%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-warning rounded-sm" />
          <span>주의 70~100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-error rounded-sm" />
          <span>과부하 &gt;100%</span>
        </div>
      </div>
    </div>
  );
}
