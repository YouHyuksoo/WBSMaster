/**
 * @file src/app/dashboard/interviews/components/InterviewStats.tsx
 * @description 인터뷰 건수와 이관율을 한 줄 정보카드(공용 StatTile)로 보여 줍니다.
 * 초보자 가이드: 상위 페이지가 계산한 건수와 이관율을 전달합니다.
 */

import { StatStrip, StatTile } from "@/components/ui";

interface InterviewStatsProps {
  completionRate: number;
  total: number;
  notTransferred: number;
  transferred: number;
}

export function InterviewStats({ completionRate, total, notTransferred, transferred }: InterviewStatsProps) {
  return (
    <StatStrip>
      <StatTile icon="speed" label="이관율" rate={completionRate} />
      <StatTile icon="list_alt" tone="text-primary" label="전체" value={total} />
      <StatTile icon="pending" tone="text-warning" label="미이관" value={notTransferred} />
      <StatTile icon="check_circle" tone="text-success" label="이관완료" value={transferred} />
    </StatStrip>
  );
}
