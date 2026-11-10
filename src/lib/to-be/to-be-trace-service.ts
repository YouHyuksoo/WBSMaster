/**
 * @file src/lib/to-be/to-be-trace-service.ts
 * @description
 * TO-BE 3단계: Gap 분석(빈 곳 네 가지)과 추적표(AS-IS → TO-BE → SFR → WBS), 엑셀 행.
 *
 * 초보자 가이드:
 * 1. loadSnapshot(projectId, db) 이 DB 를 한 번 읽고 (채팅 도구는 ctx.prisma 를 넘긴다), buildGap · buildTrace · traceSheetRows 는 DB 없이 계산만 한다 (테스트 쉬움)
 * 2. Gap
 *    ① TO-BE 가 없는 AS-IS 업무
 *    ② 해결 안 된 AS-IS 문제점: 어떤 TO-BE 해결 매핑도 없는 AS-IS 상세 이슈 + 결과가 미해결 · 부분 해결인 매핑
 *    ③ SFR 이 없는 TO-BE, ④ WBS 가 없는 TO-BE — 유지 · 폐지는 만들 기능이 없어 뺀다 (needsImplementation)
 * 3. 추적표: TO-BE 한 줄에 연결 AS-IS · SFR(적용 진행) · WBS(상태 · 진척률)를 모은다. TO-BE 가 없는 AS-IS 도 맨 뒤에 한 줄씩 넣는다
 * 4. 엑셀은 추적표와 같은 행을 쓰고, 목록 칸은 줄바꿈으로 잇는다
 */

import { prisma } from "@/lib/prisma";
import { summarizeSfr } from "./to-be-design-service";
import { WBS_REF_SELECT, sortWbs } from "./to-be-service";
import { CHANGE_TYPE_LABEL, FIX_RESULT_LABEL, STATUS_LABEL, TARGET_METHOD_LABEL, WBS_STATUS_LABEL, needsImplementation } from "./labels";

type FixResult = keyof typeof FIX_RESULT_LABEL;

export interface Snapshot {
  asIs: Array<{ id: string; asIsManagementNo: string | null; taskName: string; middleCategory: string; issues: Array<{ id: string; title: string; priority: string | null; fixCount: number }> }>;
  items: Array<{
    id: string; toBeManagementNo: string; taskName: string; middleCategory: string; summary: string | null;
    changeType: keyof typeof CHANGE_TYPE_LABEL; targetMethod: keyof typeof TARGET_METHOD_LABEL; status: keyof typeof STATUS_LABEL;
    sfrCodes: string[]; asIsIds: string[];
    wbs: Array<{ id: string; code: string; name: string; status: string; progress: number }>;
    fixes: Array<{ id: string; issueTitle: string; solution: string; result: FixResult }>;
  }>;
  sfrRows: Parameters<typeof summarizeSfr>[1];
}

export async function loadSnapshot(projectId: string, db: typeof prisma = prisma): Promise<Snapshot> {
  const [asIs, items, sfrRows] = await Promise.all([
    db.asIsOverviewItem.findMany({
      where: { overview: { projectId } },
      orderBy: [{ order: "asc" }, { asIsManagementNo: "asc" }],
      select: {
        id: true, asIsManagementNo: true, taskName: true, middleCategory: true,
        unitAnalysis: { select: { issues: { orderBy: { order: "asc" }, select: { id: true, title: true, priority: true, _count: { select: { toBeFixes: true } } } } } },
      },
    }),
    db.toBeItem.findMany({
      where: { overview: { projectId } },
      orderBy: [{ order: "asc" }, { toBeManagementNo: "asc" }],
      select: {
        id: true, toBeManagementNo: true, taskName: true, middleCategory: true, summary: true, changeType: true, targetMethod: true, status: true, sfrCodes: true,
        asIsLinks: { select: { asIsItemId: true } },
        wbsLinks: { select: { wbsItem: { select: WBS_REF_SELECT } } },
        fixes: { orderBy: { order: "asc" }, select: { id: true, issueTitle: true, solution: true, result: true } },
      },
    }),
    db.processVerificationMaster.findMany({
      where: { categoryRef: { projectId }, toBeCode: { not: null } },
      select: { toBeCode: true, managementCode: true, managementArea: true, businessUnitApplies: { select: { isApplied: true, status: true } } },
    }),
  ]);
  return {
    asIs: asIs.map(({ unitAnalysis, ...a }) => ({
      ...a,
      issues: (unitAnalysis?.issues ?? []).map(({ _count, ...i }) => ({ ...i, fixCount: _count.toBeFixes })),
    })),
    items: items.map(({ asIsLinks, wbsLinks, ...t }) => ({ ...t, asIsIds: asIsLinks.map((l) => l.asIsItemId), wbs: sortWbs(wbsLinks.map((l) => l.wbsItem)) })),
    sfrRows,
  };
}

const asIsRef = (a: Snapshot["asIs"][number]) => ({ id: a.id, no: a.asIsManagementNo, taskName: a.taskName });
const toBeRef = (t: Snapshot["items"][number]) => ({ id: t.id, no: t.toBeManagementNo, taskName: t.taskName, changeType: t.changeType });

export function buildGap(s: Snapshot) {
  const linked = new Set(s.items.flatMap((t) => t.asIsIds));
  const asIsById = new Map(s.asIs.map((a) => [a.id, a]));
  const unresolved = [
    ...s.asIs.flatMap((a) => a.issues.filter((i) => i.fixCount === 0).map((i) => ({
      key: `issue-${i.id}`, title: i.title, state: "NO_FIX" as const, solution: null, asIs: [asIsRef(a)], toBe: null,
    }))),
    ...s.items.flatMap((t) => t.fixes.filter((f) => f.result !== "RESOLVED").map((f) => ({
      key: `fix-${f.id}`, title: f.issueTitle, state: f.result as "OPEN" | "PARTIAL", solution: f.solution,
      asIs: t.asIsIds.map((id) => asIsById.get(id)).filter((a): a is Snapshot["asIs"][number] => !!a).map(asIsRef), toBe: toBeRef(t),
    }))),
  ];
  const target = s.items.filter((t) => needsImplementation(t.changeType));
  return {
    asIsWithoutToBe: s.asIs.filter((a) => !linked.has(a.id)).map((a) => ({ ...asIsRef(a), middleCategory: a.middleCategory })),
    unresolvedIssues: unresolved,
    toBeWithoutSfr: target.filter((t) => t.sfrCodes.length === 0).map(toBeRef),
    toBeWithoutWbs: target.filter((t) => t.wbs.length === 0).map(toBeRef),
    totals: { asIs: s.asIs.length, toBe: s.items.length, target: target.length },
  };
}

export function buildTrace(s: Snapshot) {
  const asIsById = new Map(s.asIs.map((a) => [a.id, a]));
  const linked = new Set(s.items.flatMap((t) => t.asIsIds));
  return [
    ...s.items.map((t) => ({
      key: t.id,
      asIs: t.asIsIds.map((id) => asIsById.get(id)).filter((a): a is Snapshot["asIs"][number] => !!a).map(asIsRef),
      toBe: { ...toBeRef(t), targetMethod: t.targetMethod, status: t.status, needsImplementation: needsImplementation(t.changeType) },
      sfr: summarizeSfr(t.sfrCodes, s.sfrRows),
      wbs: t.wbs,
    })),
    ...s.asIs.filter((a) => !linked.has(a.id)).map((a) => ({ key: `as-is-${a.id}`, asIs: [asIsRef(a)], toBe: null, sfr: [], wbs: [] })),
  ];
}

export type TraceRow = ReturnType<typeof buildTrace>[number];

/** 엑셀 한 행 = 추적표 한 줄. 키 순서가 칸 순서다 */
export function traceSheetRows(rows: TraceRow[]) {
  return rows.map((r) => ({
    "AS-IS 번호": r.asIs.map((a) => a.no ?? "").join("\n"),
    "AS-IS 업무명": r.asIs.map((a) => a.taskName).join("\n"),
    "TO-BE 번호": r.toBe?.no ?? "(TO-BE 없음)",
    "TO-BE 업무명": r.toBe?.taskName ?? "",
    "변화 유형": r.toBe ? CHANGE_TYPE_LABEL[r.toBe.changeType] : "",
    "목표 방식": r.toBe ? TARGET_METHOD_LABEL[r.toBe.targetMethod] : "",
    상태: r.toBe ? STATUS_LABEL[r.toBe.status] : "",
    SFR: r.sfr.map((f) => `${f.code} ${f.label}`).join("\n"),
    "SFR 적용": r.sfr.map((f) => (f.total ? `${f.applied}/${f.total} (검증 ${f.verified})` : "기능추적표에 없음")).join("\n"),
    WBS: r.wbs.map((w) => `${w.code} ${w.name}`).join("\n"),
    "WBS 상태": r.wbs.map((w) => `${WBS_STATUS_LABEL[w.status] ?? w.status} ${w.progress}%`).join("\n"),
  }));
}
