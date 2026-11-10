/**
 * @file src/lib/to-be/to-be-design-service.ts
 * @description
 * TO-BE 2단계 단위업무 설계: 개요 · 개선 매핑(AS-IS 문제점 → 해결) · TO-BE 흐름(Flow Chart · Swimlane) · 프로세스 정의 · 구현 기능(SFR 진행).
 *
 * 초보자 가이드:
 * 1. getToBeDesign(id): 화면에 필요한 것을 한 번에 — 업무, 해결 매핑, 프로세스, 연결 AS-IS 의 문제점 후보와 흐름도, SFR 진행
 * 2. saveToBeDesign(id, projectId, input): 보낸 부분만 통째로 바꾼다 (fixes · processes 는 목록 전체 교체, 흐름은 JSON 교체)
 * 3. 문제점 후보는 "이 TO-BE 에 연결된 AS-IS 업무"의 상세 분석 이슈만 받는다 (다른 업무 이슈는 400)
 * 4. SFR 진행은 기능추적표(ProcessVerificationMaster)에서 toBeCode 가 같은 행의 적용 · 검증 상태를 센다 (검증 기준 행 -99 제외)
 */

import { Prisma, type ToBeFixResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ToBeError, WBS_REF_SELECT, sortWbs } from "./to-be-service";

export const FIX_RESULTS: ToBeFixResult[] = ["RESOLVED", "PARTIAL", "OPEN"];

export async function getToBeDesign(id: string) {
  const item = await prisma.toBeItem.findUnique({
    where: { id },
    include: {
      overview: { select: { projectId: true } },
      asIsLinks: { select: { asIsItem: { select: { id: true, asIsManagementNo: true, taskName: true, majorCategory: true, middleCategory: true, currentMethod: true } } } },
      fixes: { orderBy: { order: "asc" } },
      processes: { orderBy: { step: "asc" } },
      wbsLinks: { select: { wbsItem: { select: WBS_REF_SELECT } } },
    },
  });
  if (!item) throw new ToBeError(404, "TO-BE 업무를 찾을 수 없습니다.");
  const asIsIds = item.asIsLinks.map((l) => l.asIsItem.id);
  const projectId = item.overview.projectId;

  const [units, sfrRows] = await Promise.all([
    asIsIds.length
      ? prisma.asIsUnitAnalysis.findMany({
          where: { overviewItemId: { in: asIsIds } },
          select: {
            overviewItemId: true, flowChartData: true, swimlaneData: true,
            issues: { orderBy: { order: "asc" }, select: { id: true, title: true, issueType: true, priority: true, suggestedFix: true } },
          },
        })
      : Promise.resolve([]),
    item.sfrCodes.length
      ? prisma.processVerificationMaster.findMany({
          where: { toBeCode: { in: item.sfrCodes }, categoryRef: { projectId } },
          select: { toBeCode: true, managementCode: true, managementArea: true, businessUnitApplies: { select: { isApplied: true, status: true } } },
        })
      : Promise.resolve([]),
  ]);

  const asIsById = new Map(item.asIsLinks.map((l) => [l.asIsItem.id, l.asIsItem]));
  const issueCandidates = units.flatMap((u) =>
    u.issues.map((iss) => ({ ...iss, asIsItemId: u.overviewItemId, asIsLabel: labelOf(asIsById.get(u.overviewItemId)) }))
  );
  const asIsFlows = units
    .filter((u) => u.flowChartData || u.swimlaneData)
    .map((u) => ({ asIsItemId: u.overviewItemId, asIsLabel: labelOf(asIsById.get(u.overviewItemId)), flowChartData: u.flowChartData, swimlaneData: u.swimlaneData }));

  const { overview: _overview, asIsLinks, wbsLinks, ...rest } = item;
  return {
    item: { ...rest, projectId, asIsItems: asIsLinks.map((l) => l.asIsItem), wbsItems: sortWbs(wbsLinks.map((l) => l.wbsItem)) },
    issueCandidates,
    asIsFlows,
    sfrProgress: summarizeSfr(item.sfrCodes, sfrRows),
  };
}

function labelOf(a: { asIsManagementNo: string | null; taskName: string } | undefined) {
  return a ? `${a.asIsManagementNo ?? ""} ${a.taskName}`.trim() : "";
}

/** SFR 코드별 세부 기능 진행 (검증 기준 행 -99 제외). 기능추적표에 없는 코드는 total 0 */
export function summarizeSfr(
  codes: string[],
  rows: Array<{ toBeCode: string | null; managementCode: string; managementArea: string; businessUnitApplies: Array<{ isApplied: boolean; status: string }> }>
) {
  return codes.map((code) => {
    const mine = rows.filter((r) => r.toBeCode === code && !r.managementCode.endsWith("-99"));
    const apply = (r: (typeof mine)[number]) => r.businessUnitApplies[0];
    return {
      code,
      label: (rows.find((r) => r.toBeCode === code)?.managementArea ?? "").replace(code, "").trim() || code,
      total: mine.length,
      applied: mine.filter((r) => apply(r)?.isApplied).length,
      verified: mine.filter((r) => apply(r)?.status === "VERIFIED").length,
    };
  });
}

export interface ToBeDesignInput {
  fixes?: unknown;
  processes?: unknown;
  flowChartData?: unknown;
  swimlaneData?: unknown;
}

const str = (v: unknown, max: number) => {
  const t = String(v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

export async function saveToBeDesign(id: string, input: ToBeDesignInput) {
  const item = await prisma.toBeItem.findUnique({ where: { id }, select: { asIsLinks: { select: { asIsItemId: true } } } });
  if (!item) throw new ToBeError(404, "TO-BE 업무를 찾을 수 없습니다.");
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (input.fixes !== undefined) {
    if (!Array.isArray(input.fixes)) throw new ToBeError(400, "개선 매핑은 배열이어야 합니다.");
    const allowed = await prisma.asIsIssue.findMany({
      where: { unitAnalysis: { overviewItemId: { in: item.asIsLinks.map((l) => l.asIsItemId) } } },
      select: { id: true, title: true },
    });
    const titleOf = new Map(allowed.map((a) => [a.id, a.title]));
    const fixes = input.fixes.map((raw, i) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const asIsIssueId = r.asIsIssueId ? String(r.asIsIssueId) : null;
      if (asIsIssueId && !titleOf.has(asIsIssueId)) throw new ToBeError(400, "연결된 AS-IS 업무의 문제점만 고를 수 있습니다.");
      const issueTitle = str(r.issueTitle, 300) ?? (asIsIssueId ? titleOf.get(asIsIssueId)! : null);
      if (!issueTitle) throw new ToBeError(400, `${i + 1}번째 개선 매핑: 문제점을 입력하세요.`);
      const solution = str(r.solution, 2000);
      if (!solution) throw new ToBeError(400, `${i + 1}번째 개선 매핑: 해결 방안을 입력하세요.`);
      const result = (r.result ?? "OPEN") as ToBeFixResult;
      if (!FIX_RESULTS.includes(result)) throw new ToBeError(400, "해결 결과 값이 올바르지 않습니다.");
      return { toBeItemId: id, asIsIssueId, issueTitle, solution, result, order: (i + 1) * 10 };
    });
    ops.push(prisma.toBeIssueFix.deleteMany({ where: { toBeItemId: id } }), prisma.toBeIssueFix.createMany({ data: fixes }));
  }

  if (input.processes !== undefined) {
    if (!Array.isArray(input.processes)) throw new ToBeError(400, "프로세스 정의는 배열이어야 합니다.");
    const processes = input.processes.map((raw, i) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const name = str(r.name, 200);
      if (!name) throw new ToBeError(400, `${i + 1}단계: 단계명을 입력하세요.`);
      return { toBeItemId: id, step: i + 1, name, owner: str(r.owner, 100), system: str(r.system, 100), input: str(r.input, 500), output: str(r.output, 500), remarks: str(r.remarks, 1000) };
    });
    ops.push(prisma.toBeProcess.deleteMany({ where: { toBeItemId: id } }), prisma.toBeProcess.createMany({ data: processes }));
  }

  const flow: Prisma.ToBeItemUpdateInput = {};
  for (const key of ["flowChartData", "swimlaneData"] as const) {
    if (input[key] === undefined) continue;
    const v = input[key];
    if (v !== null && (typeof v !== "object" || Array.isArray(v))) throw new ToBeError(400, "흐름도 데이터 형식이 올바르지 않습니다.");
    if (v && JSON.stringify(v).length > 2_000_000) throw new ToBeError(400, "흐름도가 너무 큽니다.");
    flow[key] = v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);
  }
  if (Object.keys(flow).length) ops.push(prisma.toBeItem.update({ where: { id }, data: flow }));

  if (ops.length) await prisma.$transaction(ops);
  return getToBeDesign(id);
}
