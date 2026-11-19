/**
 * @file src/lib/chat-agent/merge-calls.ts
 * @description
 * LLM 이 한 번에 여러 도구 호출을 냈을 때, 같은 메뉴의 등록 제안(propose_create_record)을 하나로 합칩니다.
 *
 * 초보자 가이드:
 * - 확인 카드는 답 하나에 한 장이라, 에이전트는 첫 제안에서 바로 답한다. 그래서 LLM 이 일정 4건을
 *   propose_create_record 4번으로 나눠 부르면 첫 건만 카드가 되고 나머지는 사라졌다 (2026-11-19 첫 주만 등록된 사례).
 * - 같은 entity 의 등록 호출이 여럿이면 records 배열 하나로 합쳐 첫 호출 자리에 둔다. 다른 메뉴 · 다른 도구는 그대로 둔다.
 * - 인자가 JSON 이 아니면 합치지 않는다 (도구가 오류를 돌려준다).
 */

import type { ToolCall } from "@/lib/llm/tool-calling";

const CREATE = "propose_create_record";

type CreateArgs = { entity?: unknown; fields?: unknown; records?: unknown };

function parse(call: ToolCall): CreateArgs | null {
  try {
    const v = JSON.parse(call.arguments) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as CreateArgs) : null;
  } catch {
    return null;
  }
}

const recordsOf = (a: CreateArgs): unknown[] => (Array.isArray(a.records) ? a.records : a.fields !== undefined ? [a.fields] : []);

export function mergeCreateCalls(calls: ToolCall[]): ToolCall[] {
  const groups = new Map<string, { first: number; records: unknown[]; count: number }>();
  calls.forEach((c, i) => {
    if (c.name !== CREATE) return;
    const a = parse(c);
    if (!a || typeof a.entity !== "string") return;
    const g = groups.get(a.entity) ?? { first: i, records: [], count: 0 };
    g.records.push(...recordsOf(a));
    g.count++;
    groups.set(a.entity, g);
  });
  const merged = [...groups.entries()].filter(([, g]) => g.count > 1);
  if (!merged.length) return calls;

  const drop = new Set<number>();
  const replace = new Map<number, ToolCall>();
  for (const [entity, g] of merged) {
    calls.forEach((c, i) => {
      if (i !== g.first && c.name === CREATE && parse(c)?.entity === entity) drop.add(i);
    });
    replace.set(g.first, { ...calls[g.first], arguments: JSON.stringify({ entity, records: g.records }) });
  }
  return calls.flatMap((c, i) => (drop.has(i) ? [] : [replace.get(i) ?? c]));
}
