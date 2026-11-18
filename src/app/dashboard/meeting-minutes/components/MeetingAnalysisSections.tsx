/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingAnalysisSections.tsx
 * @description
 * 회의록 AI 분석 결과를 섹션별로 보여 줍니다 (요약 · 논리적 모순 · 액션 항목 · 추가 확인 필요 · 해설).
 *
 * 초보자 가이드:
 * - 상태색은 섹션 아이콘과 건수에만 쓰고 면은 무채색으로 둔다 (DESIGN.md 파스텔 금지).
 * - "#3" 칩은 근거가 된 회의 내용 항목 번호다 (그리드 펼침 화면의 번호와 같다).
 * - 액션 항목의 담당자 · 기한이 원문에 없으면 warning 글자로 "미정" 을 보여 준다.
 * - wide(크게 보기 모달): 왼쪽에 요약 · 해설, 오른쪽에 모순 · 액션 · 추가 확인을 2단으로 놓는다 (1024px 미만은 1단).
 */

"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui";
import type { MeetingAnalysisResult } from "@/lib/api";

/** 근거 항목 번호 칩 */
function ItemRefs({ items }: { items: number[] }) {
  if (items.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 max-w-[45%] flex-wrap justify-end gap-1 align-middle" aria-label={`근거 항목 ${items.join(", ")}번`}>
      {items.map((n) => (
        <span
          key={n}
          className="font-mono tabular-nums text-[11px] leading-4 px-1.5 rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary"
        >
          #{n}
        </span>
      ))}
    </span>
  );
}

/** 섹션 머리 + 본문 */
function Section({ icon, iconClass, title, count, children }: { icon: string; iconClass: string; title: string; count?: number; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text dark:text-white">
        <Icon name={icon} size="xs" className={iconClass} />
        {title}
        {count !== undefined && (
          <span className={`tabular-nums text-xs font-semibold ${count > 0 ? iconClass : "text-text-secondary"}`}>{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

const EMPTY = "text-sm text-text-secondary";
const ROW = "rounded-lg border border-border dark:border-border-dark bg-white dark:bg-background-dark/40 px-3 py-2 text-sm";

export function MeetingAnalysisSections({ result, wide = false }: { result: MeetingAnalysisResult; wide?: boolean }) {
  const summary = (
    <Section icon="summarize" iconClass="text-primary" title="요약">
      <p className={`${wide ? "text-[15px] leading-7" : "text-sm leading-6"} text-text dark:text-slate-200 whitespace-pre-line`}>{result.summary}</p>
    </Section>
  );

  const contradictions = (
    <Section icon="report" iconClass="text-error" title="논리적 모순" count={result.contradictions.length}>
      {result.contradictions.length === 0 ? (
        <p className={EMPTY}>서로 맞지 않는 내용을 찾지 못했습니다.</p>
      ) : (
        <ul className="space-y-2">
          {result.contradictions.map((c, i) => (
            <li key={i} className={ROW}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-text dark:text-white">{c.title}</span>
                <ItemRefs items={c.items} />
              </div>
              {c.detail && <p className="mt-1 text-text-secondary whitespace-pre-line">{c.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  const actionItems = (
    <Section icon="task_alt" iconClass="text-primary" title="액션 항목" count={result.actionItems.length}>
      {result.actionItems.length === 0 ? (
        <p className={EMPTY}>정해진 할 일을 찾지 못했습니다.</p>
      ) : (
        <ul className="space-y-2">
          {result.actionItems.map((a, i) => (
            <li key={i} className={ROW}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-text dark:text-white">{a.task}</span>
                <ItemRefs items={a.items} />
              </div>
              <p className="mt-1 text-xs">
                <span className="text-text-secondary">담당 </span>
                <span className={a.assignee ? "text-text dark:text-slate-200" : "text-warning"}>{a.assignee ?? "미정"}</span>
                <span className="text-text-secondary"> · 기한 </span>
                <span className={a.dueDate ? "text-text dark:text-slate-200" : "text-warning"}>{a.dueDate ?? "미정"}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  const followUps = (
    <Section icon="help" iconClass="text-warning" title="추가 확인 필요" count={result.followUps.length}>
      {result.followUps.length === 0 ? (
        <p className={EMPTY}>더 확인할 사항을 찾지 못했습니다.</p>
      ) : (
        <ul className="space-y-2">
          {result.followUps.map((f, i) => (
            <li key={i} className={ROW}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-text dark:text-white">{f.question}</span>
                <ItemRefs items={f.items} />
              </div>
              {f.reason && <p className="mt-1 text-text-secondary">{f.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  const commentary = result.commentary ? (
    <Section icon="lightbulb" iconClass="text-text-secondary" title="해설">
      <div className="space-y-2">
        {result.commentary.split(/\n{2,}/).map((para, i) => (
          <p key={i} className={`${wide ? "text-[15px] leading-7" : "text-sm leading-6"} text-text dark:text-slate-200 whitespace-pre-line`}>
            {para}
          </p>
        ))}
      </div>
    </Section>
  ) : null;

  // 크게 보기: 왼쪽은 읽는 글(요약 · 해설), 오른쪽은 확인 목록(모순 · 액션 · 추가 확인)
  if (wide) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8">
        <div className="space-y-6">
          {summary}
          {commentary}
        </div>
        <div className="space-y-6">
          {contradictions}
          {actionItems}
          {followUps}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {summary}
      {contradictions}
      {actionItems}
      {followUps}
      {commentary}
    </div>
  );
}
