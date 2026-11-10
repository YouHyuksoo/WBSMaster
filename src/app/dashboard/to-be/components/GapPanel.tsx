/**
 * @file src/app/dashboard/to-be/components/GapPanel.tsx
 * @description TO-BE Gap 분석 탭 (3단계): 비어 있는 곳 네 가지를 카드로 보여 줍니다.
 *
 * 초보자 가이드:
 * 1. ① TO-BE 가 없는 AS-IS ② 해결 안 된 AS-IS 문제점 ③ SFR 이 없는 TO-BE ④ WBS 가 없는 TO-BE
 * 2. ③ · ④ 는 유지 · 폐지 업무를 뺀다 (새로 만들 기능이 없음, needsImplementation)
 * 3. 건수가 0 이면 초록, 남아 있으면 warning 색. TO-BE 번호를 누르면 단위업무 설계로 간다
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui";
import type { ToBeAnalysis, ToBeRowRef } from "@/lib/api";
import { CHANGE_TYPE_CONFIG, FIX_RESULT_CONFIG } from "../types";

type Gap = ToBeAnalysis["gap"];

function Card({ no, title, hint, count, children }: { no: string; title: string; hint: string; count: number; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-4 flex flex-col min-h-0">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-bold text-text dark:text-white">
            <span className="text-xs font-semibold text-primary tabular-nums">{no}</span>{title}
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ${count ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
          <Icon name={count ? "error" : "check_circle"} size="xs" />{count}건
        </span>
      </header>
      {count === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">빈 곳이 없습니다.</p>
      ) : (
        <ul className="mt-3 max-h-72 overflow-y-auto divide-y divide-border dark:divide-border-dark text-sm">{children}</ul>
      )}
    </section>
  );
}

const ToBeLink = ({ t }: { t: ToBeRowRef }) => (
  <Link href={`/dashboard/to-be/${t.id}`} className="tabular-nums font-semibold text-primary hover:underline">{t.no}</Link>
);
const asIsText = (list: ToBeRowRef[]) => list.map((a) => `${a.no ?? ""} ${a.taskName}`.trim()).join(", ");

function ToBeList({ items }: { items: Gap["toBeWithoutSfr"] }) {
  return items.map((t) => (
    <li key={t.id} className="flex items-center gap-2 py-1.5">
      <ToBeLink t={t} />
      <span className="min-w-0 flex-1 truncate text-text dark:text-white">{t.taskName}</span>
      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs ${CHANGE_TYPE_CONFIG[t.changeType].className}`}>{CHANGE_TYPE_CONFIG[t.changeType].label}</span>
    </li>
  ));
}

export function GapPanel({ gap }: { gap: Gap }) {
  const { totals } = gap;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card no="①" title="TO-BE 가 없는 AS-IS 업무" hint={`AS-IS ${totals.asIs}건 중 어떤 TO-BE 에도 연결되지 않은 업무`} count={gap.asIsWithoutToBe.length}>
        {gap.asIsWithoutToBe.map((a) => (
          <li key={a.id} className="flex items-center gap-2 py-1.5">
            <span className="tabular-nums text-xs text-text-secondary w-20 shrink-0">{a.no ?? "-"}</span>
            <span className="min-w-0 truncate text-text dark:text-white">{a.middleCategory} · {a.taskName}</span>
          </li>
        ))}
      </Card>

      <Card no="②" title="해결 안 된 AS-IS 문제점" hint="해결 방안이 없는 AS-IS 상세 이슈와, 결과가 미해결 · 부분 해결인 개선 매핑" count={gap.unresolvedIssues.length}>
        {gap.unresolvedIssues.map((u) => (
          <li key={u.key} className="py-2 space-y-0.5">
            <p className="flex items-start gap-2">
              <span className={`shrink-0 text-xs font-semibold ${u.state === "NO_FIX" ? "text-error" : FIX_RESULT_CONFIG[u.state].className}`}>
                {u.state === "NO_FIX" ? "해결 방안 없음" : FIX_RESULT_CONFIG[u.state].label}
              </span>
              <span className="min-w-0 text-text dark:text-white">{u.title}</span>
            </p>
            <p className="text-xs text-text-secondary">
              {u.toBe && <><ToBeLink t={u.toBe} /> · </>}{asIsText(u.asIs) || "연결 AS-IS 없음"}
            </p>
            {u.solution && <p className="text-xs text-text-secondary line-clamp-2">해결 방안: {u.solution}</p>}
          </li>
        ))}
      </Card>

      <Card no="③" title="SFR 이 없는 TO-BE 업무" hint={`구현 대상 ${totals.target}건 중 (유지 · 폐지 제외) 기능추적표 SFR 이 연결되지 않은 업무`} count={gap.toBeWithoutSfr.length}>
        <ToBeList items={gap.toBeWithoutSfr} />
      </Card>

      <Card no="④" title="WBS 가 없는 TO-BE 업무" hint={`구현 대상 ${totals.target}건 중 (유지 · 폐지 제외) 구현 WBS 작업이 연결되지 않은 업무`} count={gap.toBeWithoutWbs.length}>
        <ToBeList items={gap.toBeWithoutWbs} />
      </Card>
    </div>
  );
}
