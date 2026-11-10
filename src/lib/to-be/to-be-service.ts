/**
 * @file src/lib/to-be/to-be-service.ts
 * @description
 * TO-BE 설계 1단계 서버 로직: 총괄(프로젝트당 1개) · TO-BE 단위업무 CRUD · AS-IS 에서 초안 만들기 · 연결 후보(AS-IS 업무, SFR).
 *
 * 초보자 가이드:
 * 1. 총괄은 처음 조회할 때 만든다 (ensureOverview)
 * 2. TO-BE 관리번호는 TB-001 부터 자동 부여, 프로젝트 안에서 겹치지 않는다 (nextManagementNo)
 * 3. 초안 만들기: 아직 어떤 TO-BE 에도 연결되지 않은 AS-IS 업무만 1:1 로 복사 → 다시 눌러도 중복이 생기지 않는다
 * 4. SFR 연결은 기능추적표 toBeCode 와 같은 문자열(SFR-012 형식)로 저장한다
 * 5. 실패는 ToBeError(status, message) 로 던지고 라우트가 그대로 돌려준다
 * 6. WBS 연결(3단계)은 이 프로젝트 WBS 작업만 받는다. 수정 때 wbsItemIds 를 보내지 않으면 연결을 그대로 둔다
 */

import { Prisma, type AsIsMajorCategory, type ToBeChangeType, type ToBeStatus, type ToBeTargetMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compareWbsCode } from "./labels";

export class ToBeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const MAJOR_CATEGORIES: AsIsMajorCategory[] = ["MASTER", "MATERIAL", "PRODUCTION", "QUALITY", "EQUIPMENT", "INVENTORY", "SHIPMENT", "OTHER"];
export const CHANGE_TYPES: ToBeChangeType[] = ["NEW", "IMPROVE", "KEEP", "RETIRE"];
export const TARGET_METHODS: ToBeTargetMethod[] = ["SYSTEM", "AUTO", "POP", "PDA", "MANUAL"];
export const STATUSES: ToBeStatus[] = ["DRAFT", "REVIEW", "CONFIRMED"];
export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
const SFR_CODE = /^[A-Z]{3}-\d{3}$/;

export const WBS_REF_SELECT = { id: true, code: true, name: true, status: true, progress: true } satisfies Prisma.WbsItemSelect;

const ITEM_INCLUDE = {
  asIsLinks: {
    select: { asIsItem: { select: { id: true, asIsManagementNo: true, taskName: true, majorCategory: true, middleCategory: true } } },
  },
  wbsLinks: { select: { wbsItem: { select: WBS_REF_SELECT } } },
} satisfies Prisma.ToBeItemInclude;

/** TB-001 형식 다음 번호 */
export function nextManagementNo(existing: string[]): string {
  const max = existing.reduce((m, no) => {
    const n = Number(/^TB-(\d+)$/.exec(no)?.[1] ?? 0);
    return n > m ? n : m;
  }, 0);
  return `TB-${String(max + 1).padStart(3, "0")}`;
}

async function ensureOverview(projectId: string) {
  return prisma.toBeOverview.upsert({ where: { projectId }, create: { projectId }, update: {} });
}

/** 총괄 + TO-BE 업무 + 연결 후보 */
export async function getToBe(projectId: string) {
  const overview = await ensureOverview(projectId);
  const [items, asIsOptions, sfrOptions, wbsOptions] = await Promise.all([
    prisma.toBeItem.findMany({ where: { overviewId: overview.id }, orderBy: [{ order: "asc" }, { toBeManagementNo: "asc" }], include: ITEM_INCLUDE }),
    getAsIsOptions(projectId),
    getSfrOptions(projectId),
    getWbsOptions(projectId),
  ]);
  return { overview, items: items.map(flattenItem), asIsOptions, sfrOptions, wbsOptions };
}

function flattenItem<T extends { asIsLinks: Array<{ asIsItem: unknown }>; wbsLinks: Array<{ wbsItem: { code: string } }> }>(item: T) {
  const { asIsLinks, wbsLinks, ...rest } = item;
  return { ...rest, asIsItems: asIsLinks.map((l) => l.asIsItem), wbsItems: sortWbs(wbsLinks.map((l) => l.wbsItem)) };
}

export function sortWbs<T extends { code: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareWbsCode(a.code, b.code));
}

/** 연결할 수 있는 WBS 작업 (이 프로젝트, 코드 순) */
export async function getWbsOptions(projectId: string) {
  const rows = await prisma.wbsItem.findMany({ where: { projectId }, select: { id: true, code: true, name: true, level: true } });
  return sortWbs(rows);
}

/** 연결할 수 있는 AS-IS 업무 (이 프로젝트 AS-IS 총괄) */
export async function getAsIsOptions(projectId: string) {
  return prisma.asIsOverviewItem.findMany({
    where: { overview: { projectId } },
    orderBy: [{ order: "asc" }, { asIsManagementNo: "asc" }],
    select: { id: true, asIsManagementNo: true, taskName: true, majorCategory: true, middleCategory: true, currentMethod: true },
  });
}

/** 연결할 수 있는 기능 요구사항 (기능추적표 toBeCode 중 SFR-000 형식, 이름은 관리영역에서) */
export async function getSfrOptions(projectId: string) {
  const rows = await prisma.processVerificationMaster.findMany({
    where: { categoryRef: { projectId }, toBeCode: { not: null } },
    select: { toBeCode: true, managementArea: true },
    orderBy: { toBeCode: "asc" },
  });
  const map = new Map<string, string>();
  for (const r of rows) {
    const code = r.toBeCode!;
    if (SFR_CODE.test(code) && !map.has(code)) map.set(code, r.managementArea.replace(code, "").trim() || code);
  }
  return [...map].map(([code, label]) => ({ code, label }));
}

export interface ToBeInput {
  majorCategory?: unknown;
  middleCategory?: unknown;
  taskName?: unknown;
  changeType?: unknown;
  targetMethod?: unknown;
  summary?: unknown;
  priority?: unknown;
  status?: unknown;
  sfrCodes?: unknown;
  asIsItemIds?: unknown;
  wbsItemIds?: unknown;
  order?: unknown;
}

function pickEnum<T extends string>(value: unknown, list: readonly T[], label: string): T {
  if (!list.includes(value as T)) throw new ToBeError(400, `${label} 값이 올바르지 않습니다.`);
  return value as T;
}

function text(value: unknown, label: string, max: number, required: boolean): string | null {
  const t = String(value ?? "").trim();
  if (!t) {
    if (required) throw new ToBeError(400, `${label}은(는) 필수입니다.`);
    return null;
  }
  if (t.length > max) throw new ToBeError(400, `${label}은(는) ${max}자 이하로 입력하세요.`);
  return t;
}

/** 입력 검사 → Prisma 데이터 (부분 수정이면 들어온 칸만) */
export function parseToBeInput(input: ToBeInput, partial: boolean) {
  const has = (k: keyof ToBeInput) => !partial || k in input;
  const data: Prisma.ToBeItemUncheckedUpdateInput & Record<string, unknown> = {};
  if (has("majorCategory")) data.majorCategory = pickEnum(input.majorCategory, MAJOR_CATEGORIES, "대분류");
  if (has("middleCategory")) data.middleCategory = text(input.middleCategory, "중분류", 100, true) as string;
  if (has("taskName")) data.taskName = text(input.taskName, "업무명", 200, true) as string;
  if (has("changeType") && input.changeType !== undefined) data.changeType = pickEnum(input.changeType, CHANGE_TYPES, "변화 유형");
  if (has("targetMethod") && input.targetMethod !== undefined) data.targetMethod = pickEnum(input.targetMethod, TARGET_METHODS, "목표 방식");
  if (has("status") && input.status !== undefined) data.status = pickEnum(input.status, STATUSES, "상태");
  if ("summary" in input) data.summary = text(input.summary, "개선 요약", 2000, false);
  if ("priority" in input) data.priority = input.priority ? pickEnum(input.priority, PRIORITIES, "우선순위") : null;
  if ("order" in input && input.order !== undefined) data.order = Number(input.order) || 0;
  if ("sfrCodes" in input) {
    if (!Array.isArray(input.sfrCodes)) throw new ToBeError(400, "연결 SFR 은 배열이어야 합니다.");
    const codes = [...new Set(input.sfrCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean))];
    const bad = codes.filter((c) => !SFR_CODE.test(c));
    if (bad.length) throw new ToBeError(400, `SFR 코드 형식(예: SFR-012)이 아닙니다: ${bad.join(", ")}`);
    data.sfrCodes = codes;
  }
  return data;
}

async function checkAsIsIds(projectId: string, ids: unknown): Promise<string[] | undefined> {
  if (ids === undefined) return undefined;
  if (!Array.isArray(ids)) throw new ToBeError(400, "연결 AS-IS 는 배열이어야 합니다.");
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return [];
  const found = await prisma.asIsOverviewItem.count({ where: { id: { in: unique }, overview: { projectId } } });
  if (found !== unique.length) throw new ToBeError(400, "이 프로젝트의 AS-IS 업무만 연결할 수 있습니다.");
  return unique;
}

async function checkWbsIds(projectId: string, ids: unknown): Promise<string[] | undefined> {
  if (ids === undefined) return undefined;
  if (!Array.isArray(ids)) throw new ToBeError(400, "연결 WBS 는 배열이어야 합니다.");
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return [];
  const found = await prisma.wbsItem.count({ where: { id: { in: unique }, projectId } });
  if (found !== unique.length) throw new ToBeError(400, "이 프로젝트의 WBS 작업만 연결할 수 있습니다.");
  return unique;
}

export async function createToBeItem(projectId: string, input: ToBeInput) {
  const data = parseToBeInput(input, false);
  const asIsIds = await checkAsIsIds(projectId, input.asIsItemIds);
  const wbsIds = await checkWbsIds(projectId, input.wbsItemIds);
  const overview = await ensureOverview(projectId);
  const existing = await prisma.toBeItem.findMany({ where: { overviewId: overview.id }, select: { toBeManagementNo: true, order: true } });
  const item = await prisma.toBeItem.create({
    data: {
      ...(data as Prisma.ToBeItemUncheckedCreateInput),
      overviewId: overview.id,
      toBeManagementNo: nextManagementNo(existing.map((e) => e.toBeManagementNo)),
      order: typeof data.order === "number" ? data.order : existing.reduce((m, e) => Math.max(m, e.order), 0) + 10,
      asIsLinks: asIsIds?.length ? { create: asIsIds.map((asIsItemId) => ({ asIsItemId })) } : undefined,
      wbsLinks: wbsIds?.length ? { create: wbsIds.map((wbsItemId) => ({ wbsItemId })) } : undefined,
    },
    include: ITEM_INCLUDE,
  });
  return flattenItem(item);
}

/** TO-BE 업무의 프로젝트 (권한 검사용). 없으면 404 */
export async function projectOfItem(id: string): Promise<string> {
  const item = await prisma.toBeItem.findUnique({ where: { id }, select: { overview: { select: { projectId: true } } } });
  if (!item) throw new ToBeError(404, "TO-BE 업무를 찾을 수 없습니다.");
  return item.overview.projectId;
}

export async function updateToBeItem(id: string, projectId: string, input: ToBeInput) {
  const data = parseToBeInput(input, true);
  const asIsIds = await checkAsIsIds(projectId, input.asIsItemIds);
  const wbsIds = await checkWbsIds(projectId, input.wbsItemIds);
  const item = await prisma.$transaction(async (tx) => {
    if (asIsIds) {
      await tx.toBeAsIsLink.deleteMany({ where: { toBeItemId: id } });
      if (asIsIds.length) await tx.toBeAsIsLink.createMany({ data: asIsIds.map((asIsItemId) => ({ toBeItemId: id, asIsItemId })) });
    }
    if (wbsIds) {
      await tx.toBeWbsLink.deleteMany({ where: { toBeItemId: id } });
      if (wbsIds.length) await tx.toBeWbsLink.createMany({ data: wbsIds.map((wbsItemId) => ({ toBeItemId: id, wbsItemId })) });
    }
    return tx.toBeItem.update({ where: { id }, data, include: ITEM_INCLUDE });
  });
  return flattenItem(item);
}

export async function deleteToBeItem(id: string) {
  await prisma.toBeItem.delete({ where: { id } });
}

/** AS-IS 에서 초안 만들기: 연결되지 않은 AS-IS 업무만 1:1 복사 (개선 · 작성중) */
export async function draftFromAsIs(projectId: string): Promise<{ created: number; skipped: number }> {
  const overview = await ensureOverview(projectId);
  const [asIs, linked, existing] = await Promise.all([
    getAsIsOptions(projectId),
    prisma.toBeAsIsLink.findMany({ where: { toBeItem: { overviewId: overview.id } }, select: { asIsItemId: true } }),
    prisma.toBeItem.findMany({ where: { overviewId: overview.id }, select: { toBeManagementNo: true, order: true } }),
  ]);
  const linkedSet = new Set(linked.map((l) => l.asIsItemId));
  const todo = asIs.filter((a) => !linkedSet.has(a.id));
  const numbers = existing.map((e) => e.toBeManagementNo);
  let order = existing.reduce((m, e) => Math.max(m, e.order), 0);
  await prisma.$transaction(
    todo.map((a) => {
      const no = nextManagementNo(numbers);
      numbers.push(no);
      order += 10;
      return prisma.toBeItem.create({
        data: {
          overviewId: overview.id, toBeManagementNo: no, majorCategory: a.majorCategory, middleCategory: a.middleCategory,
          taskName: a.taskName, changeType: "IMPROVE", targetMethod: "SYSTEM", status: "DRAFT", order,
          asIsLinks: { create: [{ asIsItemId: a.id }] },
        },
      });
    })
  );
  return { created: todo.length, skipped: asIs.length - todo.length };
}
