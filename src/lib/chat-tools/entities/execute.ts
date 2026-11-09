/**
 * @file src/lib/chat-tools/entities/execute.ts
 * @description
 * 확인된 공통 제안(entity_create · entity_update · entity_delete)을 화면 API 핸들러로 실행합니다.
 *
 * 초보자 가이드:
 * - 확인 API(/api/chat/actions/[id]/confirm) 요청 안에서 화면 API 핸들러를 직접 부른다.
 *   같은 요청이라 로그인 쿠키가 그대로 쓰이고, 인증·권한·채번·알림이 화면에서 할 때와 똑같다.
 * - 등록: POST(본문 + projectId), 수정: PATCH(대상마다), 삭제: DELETE(대상마다). 실패하면 거기서 멈춘다.
 */

import { NextRequest } from "next/server";
import type { EntitySpec, RouteModule } from "./types";

export type EntityOutcome = { ok: true; resultRef: string; link: string } | { ok: false; error: string; status: number };

type Handler = (req: NextRequest, ctx?: { params: Promise<{ id: string }> }) => Promise<Response>;

function handler(mod: RouteModule, method: string): Handler | null {
  const h = mod[method];
  return typeof h === "function" ? (h as Handler) : null;
}

/** 화면 API 핸들러에 넘길 내부 요청 (같은 요청의 쿠키는 next/headers 가 읽는다) */
export const routeRequest = (path: string, method: string, body?: unknown) =>
  new NextRequest(new URL(path, "http://internal.local"), {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

export async function routeError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error || `처리하지 못했습니다 (HTTP ${res.status})`;
}

export async function executeEntityAction(
  action: { kind: string; projectId: string; args: unknown },
  specs: EntitySpec[]
): Promise<EntityOutcome> {
  const a = (action.args ?? {}) as { entity?: string; data?: Record<string, unknown>; targetIds?: string[]; patch?: Record<string, unknown> };
  const spec = specs.find((s) => s.key === a.entity);
  if (!spec) return { ok: false, error: `알 수 없는 메뉴입니다: ${a.entity}`, status: 400 };

  if (action.kind === "entity_create") {
    const mod = spec.collectionRoute ? await spec.collectionRoute() : null;
    const POST = mod && handler(mod, "POST");
    if (!POST || !spec.collectionPath) return { ok: false, error: `${spec.label} 등록은 지원하지 않습니다.`, status: 400 };
    const res = await POST(routeRequest(spec.collectionPath, "POST", { ...a.data, projectId: action.projectId }));
    if (!res.ok) return { ok: false, error: await routeError(res), status: res.status };
    const body = (await res.json().catch(() => ({}))) as { id?: string; data?: { id?: string } };
    return { ok: true, resultRef: body.id ?? body.data?.id ?? "", link: spec.link };
  }

  const method = action.kind === "entity_update" ? spec.updateMethod ?? "PATCH" : action.kind === "entity_delete" ? "DELETE" : null;
  if (!method) return { ok: false, error: `알 수 없는 동작입니다: ${action.kind}`, status: 400 };
  const mod = spec.itemRoute ? await spec.itemRoute() : null;
  const fn = mod && handler(mod, method);
  if (!fn || !spec.itemPath) return { ok: false, error: `${spec.label} ${method === "DELETE" ? "삭제" : "수정"}는 지원하지 않습니다.`, status: 400 };

  const ids = a.targetIds ?? [];
  let done = 0;
  for (const id of ids) {
    const res = await fn(routeRequest(spec.itemPath(id), method, method === "DELETE" ? undefined : a.patch ?? {}), { params: Promise.resolve({ id }) });
    if (!res.ok) {
      const msg = await routeError(res);
      return { ok: false, error: done > 0 ? `${msg} (${done}건 처리 후 중단)` : msg, status: res.status };
    }
    done++;
  }
  return { ok: true, resultRef: ids[0] ?? "", link: spec.link };
}
