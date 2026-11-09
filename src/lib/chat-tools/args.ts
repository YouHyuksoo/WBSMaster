/**
 * @file src/lib/chat-tools/args.ts
 * @description
 * 채팅 도구 인자 검증 도우미입니다. LLM 이 보낸 인자를 확인하고, 틀리면 허용값을 담은 오류를 던져 LLM 이 고쳐 다시 부르게 합니다.
 *
 * 초보자 가이드:
 * - enumList(v, key, field): 사전(term-dictionary)의 Enum 값만 허용
 * - limit(v): 기본 50, 최대 200
 * - optString / optDate / optBool / obj
 */

import { enumValues, type TermDictionaryKey } from "./term-dictionary";

export function obj(args: unknown): Record<string, unknown> {
  return args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
}

export function optString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function optBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export function optDate(v: unknown, field: string): Date | undefined {
  const s = optString(v);
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`${field} 는 YYYY-MM-DD 형식이어야 합니다: ${s}`);
  return d;
}

export function limit(v: unknown): number {
  const n = typeof v === "number" ? Math.floor(v) : 50;
  return Math.min(Math.max(n, 1), 200);
}

/** Enum 값 목록 검증 (단일 문자열도 허용) */
export function enumList(v: unknown, key: TermDictionaryKey, field: string): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const list = Array.isArray(v) ? v : [v];
  const allowed = enumValues(key);
  const bad = list.filter((x) => typeof x !== "string" || !allowed.includes(x));
  if (bad.length) throw new Error(`${field} 값이 올바르지 않습니다: ${bad.join(", ")}. 허용값: ${allowed.join(", ")}`);
  return list.length ? (list as string[]) : undefined;
}

/** 조회 결과 요약: "N건: 코드1, 코드2 ..." (맥락 요약에 쓰임) */
export function summarize(label: string, rows: { code?: string | null; title?: string | null; name?: string | null }[], total?: number): string {
  const head = rows.slice(0, 10).map((r) => r.code || r.title || r.name).filter(Boolean).join(", ");
  const count = total ?? rows.length;
  return `${label} ${count}건${head ? `: ${head}${count > 10 ? " …" : ""}` : ""}`;
}
