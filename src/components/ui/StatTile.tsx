/**
 * @file src/components/ui/StatTile.tsx
 * @description
 * 화면 위쪽 정보카드(통계 카드) 공용 부품입니다. 높이 36px(h-9) 한 줄로 고정합니다: [아이콘] 이름 ··· 값
 *
 * 초보자 가이드:
 * 1. **StatStrip**: 카드 묶음. 카드 수가 적어도 늘어나지 않고 내용 폭(최소 8.5rem)으로 왼쪽부터 놓인다
 * 2. **StatTile**: 카드 하나. tone 은 아이콘 글자색(예: "text-success"), valueTone 은 값 글자색
 * 3. **rate**: 0~100 을 주면 값이 "n%" 로 나오고 아래 가장자리에 2px 진행 막대가 붙는다 (높이는 그대로)
 * 4. **items**: 값 여러 개를 한 카드에 "이름 값" 으로 나란히 놓는다
 * 5. **note**: 값 옆에 이어 쓰는 설명. 길면 말줄임하고 마우스를 올리면 전부 보인다 (꼭 보여야 하는 경고에만)
 * 6. 아이콘 상자 + 큰 숫자 + 아래 이름의 두 줄 카드를 화면마다 만들지 않는다 (stat-tile.test.tsx 가 검사)
 */

import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function StatStrip({ children, label = "요약" }: { children: ReactNode; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}

export interface StatTileProps {
  icon: string;
  label: string;
  /** 아이콘 글자색 */
  tone?: string;
  value?: string | number;
  /** 값 글자색 */
  valueTone?: string;
  /** 비율(0~100). 주면 value 대신 "n%" 와 아래 막대를 보여 준다 */
  rate?: number;
  /** 값 여러 개 */
  items?: Array<{ label: string; value: string | number; tone?: string }>;
  /** 마우스를 올리면 보이는 설명 */
  title?: string;
  /** 값 옆에 이어 쓰는 설명 */
  note?: string;
  role?: "alert";
}

const VALUE = "text-base font-bold leading-none tabular-nums whitespace-nowrap";
const PLAIN_VALUE = "text-text dark:text-white";

export function StatTile({ icon, label, tone = "text-primary", value, valueTone, rate, items, title, note, role }: StatTileProps) {
  return (
    <div
      role={role}
      title={title ?? note}
      className="relative flex h-9 min-w-[8.5rem] max-w-full items-center gap-2 overflow-hidden rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark px-2.5"
    >
      <Icon name={icon} size="xs" className={`shrink-0 ${tone}`} />
      <span className="shrink-0 whitespace-nowrap pr-1 text-sm text-text-secondary">{label}</span>
      {items ? (
        <span className="ml-auto flex items-center gap-3">
          {items.map((item) => (
            <span key={item.label} className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-xs text-text-secondary">{item.label}</span>
              <span className={`${VALUE} ${item.tone ?? PLAIN_VALUE}`}>{item.value}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className={`ml-auto ${VALUE} ${valueTone ?? (rate === undefined ? PLAIN_VALUE : "text-primary")}`}>
          {rate === undefined ? value : `${rate}%`}
        </span>
      )}
      {note && <span className="min-w-0 truncate text-xs text-text-secondary">{note}</span>}
      {rate !== undefined && (
        <span role="progressbar" aria-label={label} aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} className="absolute inset-x-0 bottom-0 h-0.5 bg-border/60 dark:bg-border-dark/60">
          <span className="block h-full bg-primary motion-safe:transition-[width]" style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
        </span>
      )}
    </div>
  );
}
