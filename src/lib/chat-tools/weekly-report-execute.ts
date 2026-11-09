/**
 * @file src/lib/chat-tools/weekly-report-execute.ts
 * @description
 * 확인된 주간보고 항목 제안(weekly_item_create · weekly_item_update · weekly_item_delete)을 화면 API 핸들러로 실행합니다.
 *
 * 초보자 가이드:
 * - 확인 API 요청 안에서 화면 API 핸들러를 직접 부르므로 로그인 쿠키·본인 보고서 확인이 화면과 같다.
 * - 등록: 그 주 보고서가 없으면 POST /api/weekly-reports 로 먼저 만든다 (이미 있으면 409 의 existingId 사용).
 * - 수정·삭제: /api/weekly-reports/{reportId}/items/{itemId} 에 PATCH/DELETE. 실패하면 거기서 멈춘다.
 */

import type { NextRequest } from "next/server";
import { routeError, routeRequest } from "./entities/execute";
import type { WeekInfo } from "./weekly-report";

export type WeeklyOutcome = { ok: true; resultRef: string; link: string } | { ok: false; error: string; status: number };
type Handler<P> = (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;
type CreateArgs = { week: WeekInfo; reportId: string | null; data: Record<string, unknown> };
type ItemArgs = { reportId: string; itemIds: string[]; patch?: Record<string, unknown> };

const LINK = "/dashboard/weekly-report";
const fail = async (res: Response, done = 0): Promise<WeeklyOutcome> => {
  const msg = await routeError(res);
  return { ok: false, error: done > 0 ? `${msg} (${done}건 처리 후 중단)` : msg, status: res.status };
};

async function ensureReport(projectId: string, a: CreateArgs): Promise<{ id: string } | WeeklyOutcome> {
  if (a.reportId) return { id: a.reportId };
  const { POST } = await import("@/app/api/weekly-reports/route");
  const res = await POST(routeRequest("/api/weekly-reports", "POST", { projectId, ...a.week }));
  const body = (await res.clone().json().catch(() => ({}))) as { id?: string; existingId?: string };
  if (res.status === 409 && body.existingId) return { id: body.existingId };
  if (!res.ok || !body.id) return fail(res);
  return { id: body.id };
}

export async function executeWeeklyAction(action: { kind: string; projectId: string; args: unknown }): Promise<WeeklyOutcome> {
  if (action.kind === "weekly_item_create") {
    const a = action.args as CreateArgs;
    const report = await ensureReport(action.projectId, a);
    if ("ok" in report) return report;
    const { POST } = await import("@/app/api/weekly-reports/[id]/items/route");
    const res = await (POST as Handler<{ id: string }>)(routeRequest(`/api/weekly-reports/${report.id}/items`, "POST", a.data), { params: Promise.resolve({ id: report.id }) });
    if (!res.ok) return fail(res);
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, resultRef: body.id ?? report.id, link: LINK };
  }

  const method = action.kind === "weekly_item_update" ? "PATCH" : action.kind === "weekly_item_delete" ? "DELETE" : null;
  if (!method) return { ok: false, error: `알 수 없는 동작입니다: ${action.kind}`, status: 400 };
  const a = action.args as ItemArgs;
  const mod = await import("@/app/api/weekly-reports/[id]/items/[itemId]/route");
  const fn = mod[method] as Handler<{ id: string; itemId: string }>;
  let done = 0;
  for (const itemId of a.itemIds ?? []) {
    const path = `/api/weekly-reports/${a.reportId}/items/${itemId}`;
    const res = await fn(routeRequest(path, method, method === "PATCH" ? a.patch ?? {} : undefined), { params: Promise.resolve({ id: a.reportId, itemId }) });
    if (!res.ok) return fail(res, done);
    done++;
  }
  return { ok: true, resultRef: a.itemIds?.[0] ?? "", link: LINK };
}
