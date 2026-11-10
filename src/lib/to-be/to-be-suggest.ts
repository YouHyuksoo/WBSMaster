/**
 * @file src/lib/to-be/to-be-suggest.ts
 * @description
 * TO-BE 4단계: AI 초안 제안. 연결 AS-IS(현행 · 이슈) + 인터뷰 "원하는 결과(TO-BE)" + 기능추적표 SFR 목록을 주고
 * 변화 유형 · 목표 방식 · 우선순위 · 개선 요약 · 연결 SFR · 개선 매핑 후보를 받는다. 저장하지 않는다 (화면에서 사용자가 골라 적용).
 *
 * 초보자 가이드:
 * 1. loadSuggestContext(id): 프롬프트 재료를 모은다. 인터뷰는 이 업무와 낱말이 많이 겹치는 순서로 최대 5건
 * 2. buildSuggestPrompt(ctx): 시스템 · 사용자 프롬프트. 인터뷰가 없으면 "인터뷰 없음"이라고 적어 지어내지 않게 한다
 * 3. parseSuggestion(raw, sfrCodes): JSON 을 꺼내 열거값을 검사하고, 기능추적표에 없는 SFR 코드는 버린다(droppedSfr 로 알려 줌)
 * 4. suggestToBe(generate, ctx): generate 는 바깥에서 받는다 (테스트는 가짜 함수, 실제는 사용자 AI 설정)
 */

import { prisma } from "@/lib/prisma";
import { extractJson } from "@/lib/meeting-minutes-ai";
import { CHANGE_TYPES, PRIORITIES, TARGET_METHODS, ToBeError, getSfrOptions } from "./to-be-service";
import { CHANGE_TYPE_LABEL, TARGET_METHOD_LABEL } from "./labels";

export type Generate = (prompt: string, systemPrompt: string) => Promise<string>;

const MAX_SUMMARY = 2000;
const MAX_FIXES = 5;
const MAX_INTERVIEWS = 5;

export interface SuggestContext {
  item: { toBeManagementNo: string; taskName: string; middleCategory: string; changeType: string; targetMethod: string; summary: string | null; sfrCodes: string[] };
  asIs: Array<{ no: string | null; taskName: string; currentMethod: string; issueSummary: string | null; details: string | null; remarks: string | null }>;
  interviews: Array<{ code: string | null; title: string; category: string | null; painPoints: string | null; desiredResults: string | null }>;
  sfrOptions: Array<{ code: string; label: string }>;
}

export interface ToBeSuggestion {
  changeType: (typeof CHANGE_TYPES)[number];
  targetMethod: (typeof TARGET_METHODS)[number];
  priority: (typeof PRIORITIES)[number] | null;
  summary: string;
  sfrCodes: string[];
  fixes: Array<{ issue: string; solution: string }>;
  reason: string;
  droppedSfr: string[];
  interviewCount: number;
}

const words = (t: string) => new Set(t.toLowerCase().split(/[^0-9a-z가-힣]+/).filter((w) => w.length >= 2));

/** 인터뷰를 이 업무와 겹치는 낱말 수로 줄 세워 앞에서 n 건 (겹침 0 은 뺀다) */
export function pickInterviews<T extends { title: string; category: string | null; painPoints: string | null; desiredResults: string | null }>(
  interviews: T[], basis: string, n = MAX_INTERVIEWS,
): T[] {
  const key = words(basis);
  return interviews
    .map((iv) => ({ iv, score: [...words([iv.title, iv.category, iv.painPoints, iv.desiredResults].join(" "))].filter((w) => key.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.iv);
}

export async function loadSuggestContext(id: string): Promise<{ projectId: string; ctx: SuggestContext }> {
  const item = await prisma.toBeItem.findUnique({
    where: { id },
    select: {
      toBeManagementNo: true, taskName: true, middleCategory: true, changeType: true, targetMethod: true, summary: true, sfrCodes: true,
      overview: { select: { projectId: true } },
      asIsLinks: { select: { asIsItem: { select: { asIsManagementNo: true, taskName: true, currentMethod: true, issueSummary: true, details: true, remarks: true } } } },
    },
  });
  if (!item) throw new ToBeError(404, "TO-BE 업무를 찾을 수 없습니다.");
  const projectId = item.overview.projectId;
  const [interviews, sfrOptions] = await Promise.all([
    prisma.interview.findMany({
      where: { projectId, OR: [{ desiredResults: { not: null } }, { painPoints: { not: null } }] },
      select: { code: true, title: true, category: true, painPoints: true, desiredResults: true },
      take: 300,
    }),
    getSfrOptions(projectId),
  ]);
  const asIs = item.asIsLinks.map(({ asIsItem: a }) => ({ no: a.asIsManagementNo, taskName: a.taskName, currentMethod: a.currentMethod, issueSummary: a.issueSummary, details: a.details, remarks: a.remarks }));
  const basis = [item.taskName, item.middleCategory, item.summary, ...asIs.map((a) => `${a.taskName} ${a.issueSummary ?? ""}`)].join(" ");
  const { overview: _o, asIsLinks: _l, ...rest } = item;
  return { projectId, ctx: { item: rest, asIs, interviews: pickInterviews(interviews, basis), sfrOptions } };
}

const cut = (t: string | null | undefined, n: number) => (!t ? "" : t.length > n ? `${t.slice(0, n)}…` : t);

export const SUGGEST_SYSTEM_PROMPT = `당신은 MES 고도화 프로젝트의 업무 분석가입니다. 현행(AS-IS) 업무 하나를 보고 미래(TO-BE) 업무 초안을 제안합니다.
규칙:
- 주어진 자료(AS-IS · 인터뷰 · SFR 목록)에 있는 내용만 근거로 쓴다. 없는 수치 · 일정 · 설비 이름을 지어내지 않는다.
- 인터뷰가 "인터뷰 없음"이면 인터뷰를 인용하지 않는다.
- sfrCodes 는 반드시 "SFR 목록"에 있는 코드만 고른다. 맞는 것이 없으면 빈 배열.
- 이번 사업 범위와 무관하면 changeType 은 KEEP(유지)으로 둔다.
- 한국어로, 개선 요약은 2~3문장.
JSON 만 출력한다:
{"changeType":"NEW|IMPROVE|KEEP|RETIRE","targetMethod":"SYSTEM|AUTO|POP|PDA|MANUAL","priority":"HIGH|MEDIUM|LOW|null","summary":"무엇이 달라지는가","sfrCodes":["SFR-012"],"fixes":[{"issue":"AS-IS 문제점","solution":"TO-BE 해결 방안"}],"reason":"이렇게 제안한 근거 한두 문장"}`;

export function buildSuggestPrompt(ctx: SuggestContext): string {
  const asIs = ctx.asIs.length
    ? ctx.asIs.map((a) => `- ${a.no ?? ""} ${a.taskName} [현행: ${a.currentMethod}]\n  이슈: ${cut(a.issueSummary, 400) || "없음"}\n  내용: ${cut(a.details, 800) || "없음"}\n  비고: ${cut(a.remarks, 300) || "없음"}`).join("\n")
    : "연결된 AS-IS 없음 (신규 업무)";
  const interviews = ctx.interviews.length
    ? ctx.interviews.map((iv) => `- ${iv.code ?? ""} ${iv.title}${iv.category ? ` (${iv.category})` : ""}\n  문제점: ${cut(iv.painPoints, 400) || "없음"}\n  원하는 결과: ${cut(iv.desiredResults, 500) || "없음"}`).join("\n")
    : "인터뷰 없음";
  const sfr = ctx.sfrOptions.length ? ctx.sfrOptions.map((s) => `${s.code} ${s.label}`).join("\n") : "SFR 없음";
  return [
    `## TO-BE 업무 ${ctx.item.toBeManagementNo} ${ctx.item.taskName} (중분류: ${ctx.item.middleCategory})`,
    `현재 값: 변화 유형 ${CHANGE_TYPE_LABEL[ctx.item.changeType as keyof typeof CHANGE_TYPE_LABEL] ?? ctx.item.changeType}, 목표 방식 ${TARGET_METHOD_LABEL[ctx.item.targetMethod as keyof typeof TARGET_METHOD_LABEL] ?? ctx.item.targetMethod}, 연결 SFR ${ctx.item.sfrCodes.join(", ") || "없음"}`,
    `현재 개선 요약: ${cut(ctx.item.summary, 600) || "없음"}`,
    `## 연결 AS-IS\n${asIs}`,
    `## 인터뷰 (원하는 결과)\n${interviews}`,
    `## SFR 목록 (기능추적표)\n${sfr}`,
  ].join("\n\n");
}

function pick<T extends string>(value: unknown, list: readonly T[], label: string): T {
  const v = String(value ?? "").trim().toUpperCase();
  if (!list.includes(v as T)) throw new ToBeError(502, `AI 응답의 ${label} 값이 올바르지 않습니다: ${String(value)}`);
  return v as T;
}

export function parseSuggestion(raw: string, knownSfr: string[], interviewCount = 0): ToBeSuggestion {
  let data: Record<string, unknown>;
  try {
    data = extractJson(raw) as Record<string, unknown>;
  } catch {
    throw new ToBeError(502, "AI 응답을 읽지 못했습니다. 다시 시도하세요.");
  }
  if (!data || typeof data !== "object") throw new ToBeError(502, "AI 응답 형식이 올바르지 않습니다.");
  const known = new Set(knownSfr);
  const codes = Array.isArray(data.sfrCodes) ? [...new Set(data.sfrCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean))] : [];
  const priorityRaw = data.priority == null || String(data.priority).toLowerCase() === "null" || data.priority === "" ? null : data.priority;
  const fixes = (Array.isArray(data.fixes) ? data.fixes : [])
    .map((f) => ({ issue: String((f as Record<string, unknown>)?.issue ?? "").trim().slice(0, 300), solution: String((f as Record<string, unknown>)?.solution ?? "").trim().slice(0, 1000) }))
    .filter((f) => f.issue && f.solution)
    .slice(0, MAX_FIXES);
  const summary = String(data.summary ?? "").trim().slice(0, MAX_SUMMARY);
  if (!summary) throw new ToBeError(502, "AI 응답에 개선 요약이 없습니다. 다시 시도하세요.");
  return {
    changeType: pick(data.changeType, CHANGE_TYPES, "변화 유형"),
    targetMethod: pick(data.targetMethod, TARGET_METHODS, "목표 방식"),
    priority: priorityRaw === null ? null : pick(priorityRaw, PRIORITIES, "우선순위"),
    summary,
    sfrCodes: codes.filter((c) => known.has(c)),
    droppedSfr: codes.filter((c) => !known.has(c)),
    fixes,
    reason: String(data.reason ?? "").trim().slice(0, 600),
    interviewCount,
  };
}

export async function suggestToBe(generate: Generate, ctx: SuggestContext): Promise<ToBeSuggestion> {
  const raw = await generate(buildSuggestPrompt(ctx), SUGGEST_SYSTEM_PROMPT);
  return parseSuggestion(raw, ctx.sfrOptions.map((s) => s.code), ctx.interviews.length);
}
