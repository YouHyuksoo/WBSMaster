/**
 * @file src/app/dashboard/chat/components/AnswerSourceBadges.tsx
 * @description 채팅 답 아래에 "온톨로지로 답함 · 지식 그래프로 답함 · 업무 DB로 답함(기존)" 표시를 붙입니다.
 * 초보자 가이드:
 * - 판단은 src/lib/chat-agent/answer-sources.ts 가 한다(실제로 결과를 준 도구 기준).
 * - 마우스를 올리면 무슨 뜻인지와 쓴 도구 이름이 보인다.
 */
import { ANSWER_SOURCE_INFO, answerSources, type AnswerSource } from "@/lib/chat-agent/answer-sources";

const COLORS: Record<AnswerSource, string> = {
  ontology: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  graph: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  db: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  sql: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  none: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export function AnswerSourceBadges({ toolSummary, sqlQuery }: { toolSummary?: { tool: string }[] | null; sqlQuery?: string | null }) {
  const sources = answerSources({ toolSummary, sqlQuery });
  if (!sources.length) return null;
  const tools = Array.isArray(toolSummary) ? [...new Set(toolSummary.map((t) => t.tool))].join(", ") : "";
  return (
    <>
      {sources.map((source) => (
        <span key={source} title={`${ANSWER_SOURCE_INFO[source].help}${tools ? ` (쓴 도구: ${tools})` : ""}`}
          className={`ml-2 px-1.5 py-0.5 rounded text-xs ${COLORS[source]}`}>
          {ANSWER_SOURCE_INFO[source].label}
        </span>
      ))}
    </>
  );
}
