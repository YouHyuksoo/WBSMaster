/**
 * @file src/lib/chat-tools/process-verification.ts
 * @description 기능추적표의 실제 마스터·적용 행을 조회하고 전체 건수를 집계하는 채팅 도구입니다.
 * 초보자 가이드:
 * - 백업용 items가 아닌 masters를 categoryRef.projectId로 제한합니다.
 * - 화면처럼 기본 적용 행이 없으면 미적용·대기로 계산합니다.
 * - 목록 제한과 전체 집계를 분리하여 일부 행을 전체 건수로 답하지 않습니다.
 */
import type { Prisma, VerificationStatus } from "@prisma/client";
import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";
import { limit, obj, optBool, optString } from "./args";
import type { ChatTool } from "./types";

const STATUS: Record<VerificationStatus, string> = {
  PENDING: "대기", IN_PROGRESS: "진행중", VERIFIED: "검증완료", NOT_APPLICABLE: "해당없음",
};
type Filters = { isApplied?: boolean; status?: VerificationStatus; category?: string; productType?: string; keyword?: string };
type ListArgs = Filters & { limit: number };
type GroupBy = "category" | "status" | "isApplied" | "productType";
type StatsArgs = Filters & { groupBy: GroupBy };
const properties = {
  isApplied: { type: ["boolean", "null"], description: "적용만 true / 미적용만 false / 전체 null. 요청한 경우에만 필터한다." },
  status: { type: ["string", "null"], enum: [...Object.keys(STATUS), null], description: "전체 null. PENDING 대기, IN_PROGRESS 진행중, VERIFIED 검증완료, NOT_APPLICABLE 해당없음" },
  category: { type: ["string", "null"], description: "특정 분류명·코드를 요청한 경우만 입력. 전체 분류 집계는 null" },
  productType: { type: ["string", "null"], description: "특정 제품유형을 요청한 경우만 입력 (SMD, HANES, LEADTAB 등). 전체 null" },
  keyword: { type: ["string", "null"], description: "관리코드·관리영역·세부항목·MES 매핑·검증내용 검색. 키워드를 요청하지 않으면 null" },
};
function parseFilters(a: Record<string, unknown>): Filters {
  const status = optString(a.status);
  if (status && !Object.hasOwn(STATUS, status)) throw new Error("올바른 검증 상태가 아닙니다.");
  return { isApplied: optBool(a.isApplied), status: status as VerificationStatus | undefined,
    category: optString(a.category), productType: optString(a.productType), keyword: optString(a.keyword) };
}
function whereFor(projectId: string, a: Filters): Prisma.ProcessVerificationMasterWhereInput {
  const and: Prisma.ProcessVerificationMasterWhereInput[] = [];
  const apply = { businessUnit: DEFAULT_BUSINESS_UNIT };
  if (a.isApplied !== undefined) and.push({ businessUnitApplies: a.isApplied
    ? { some: { ...apply, isApplied: true } } : { none: { ...apply, isApplied: true } } });
  if (a.status) and.push(a.status === "PENDING" ? { OR: [
    { businessUnitApplies: { some: { ...apply, status: "PENDING" } } },
    { businessUnitApplies: { none: apply } },
  ] } : { businessUnitApplies: { some: { ...apply, status: a.status } } });
  if (a.keyword) and.push({ OR: ["managementCode", "managementArea", "detailItem", "mesMapping", "verificationDetail"]
    .map(field => ({ [field]: { contains: a.keyword, mode: "insensitive" } })) });
  if (a.category) and.push({ categoryRef: { OR: [{ name: a.category }, { code: a.category }] } });
  return { categoryRef: { projectId }, ...(a.productType ? { productType: a.productType } : {}), AND: and };
}
const applies = { where: { businessUnit: DEFAULT_BUSINESS_UNIT }, select: { isApplied: true, status: true } } as const;

export const listProcessVerificationTool: ChatTool<ListArgs> = {
  name: "list_process_verification",
  description: "현재 프로젝트의 기능추적표(업무기능추적표·공정검증) 마스터 목록을 조회한다. 적용/미적용·검증 상태·분류·제품유형으로 필터한다. 전체 건수·분류별 집계·차트는 process_verification_stats를 쓴다.",
  parameters: { type: "object", properties: { ...properties, limit: { type: "integer" } }, additionalProperties: false },
  kind: "read",
  parse: args => { const a = obj(args); return { ...parseFilters(a), limit: limit(a.limit) }; },
  async execute(ctx, a) {
    const where = whereFor(ctx.projectId, a);
    const [records, total] = await Promise.all([
      ctx.prisma.processVerificationMaster.findMany({ where, take: a.limit,
        orderBy: [{ categoryRef: { order: "asc" } }, { order: "asc" }, { managementCode: "asc" }, { id: "asc" }],
        select: { managementCode: true, productType: true, managementArea: true, detailItem: true, mesMapping: true,
          verificationDetail: true, categoryRef: { select: { name: true } }, businessUnitApplies: applies } }),
      ctx.prisma.processVerificationMaster.count({ where }),
    ]);
    return { kind: "data", summary: `기능추적표 전체 ${total}건 중 ${records.length}건 표시`, rows: records.map(r => ({
      관리코드: r.managementCode, 제품유형: r.productType, 분류: r.categoryRef.name, 관리영역: r.managementArea,
      세부항목: r.detailItem, MES매핑: r.mesMapping, 검증내용: r.verificationDetail,
      적용여부: r.businessUnitApplies[0]?.isApplied ? "적용" : "미적용", 검증상태: STATUS[r.businessUnitApplies[0]?.status ?? "PENDING"],
    })) };
  },
};

export const processVerificationStatsTool: ChatTool<StatsArgs> = {
  name: "process_verification_stats",
  description: "현재 프로젝트 기능추적표(공정검증)의 전체 건수와 분류별·검증상태별·적용여부별·제품유형별 건수를 집계한다. 차트 질문도 이 결과로 답한다. 행 수는 마스터 기준이며 적용 행이 없으면 미적용·대기다. 사용자가 지정하지 않은 필터는 반드시 null로 둔다. 카테고리별 전체 건수는 groupBy=category, 나머지 모두 null로 한 번 조회한다.",
  parameters: { type: "object", properties: { ...properties, groupBy: { type: "string", enum: ["category", "status", "isApplied", "productType"] } }, additionalProperties: false },
  kind: "read",
  parse(args) {
    const a = obj(args); const groupBy = a.groupBy ?? "category";
    if (!["category", "status", "isApplied", "productType"].includes(String(groupBy))) throw new Error("올바른 집계 기준이 아닙니다.");
    return { ...parseFilters(a), groupBy: groupBy as GroupBy };
  },
  async execute(ctx, a) {
    const records = await ctx.prisma.processVerificationMaster.findMany({ where: whereFor(ctx.projectId, a),
      select: { productType: true, categoryRef: { select: { name: true } }, businessUnitApplies: applies } });
    const counts = new Map<string, number>();
    for (const r of records) {
      const apply = r.businessUnitApplies[0];
      const name = a.groupBy === "category" ? r.categoryRef.name : a.groupBy === "productType" ? r.productType
        : a.groupBy === "isApplied" ? (apply?.isApplied ? "적용" : "미적용") : STATUS[apply?.status ?? "PENDING"];
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return { kind: "data", summary: `기능추적표 전체 ${records.length}건 (마스터 기준, ${a.groupBy}별 집계)`,
      rows: [...counts].sort(([a], [b]) => a.localeCompare(b, "ko")).map(([name, value]) => ({ name, value })) };
  },
};
