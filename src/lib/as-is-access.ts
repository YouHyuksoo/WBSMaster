/**
 * @file src/lib/as-is-access.ts
 * @description
 * AS-IS 분석 하위 레코드가 어느 프로젝트에 속하는지 찾는 도우미입니다.
 *
 * 초보자 가이드:
 * - AS-IS 하위 표(코드 정의 · 데이터 모델 · 인터뷰 · 이슈 · 화면 등)에는 projectId 칼럼이 없다.
 *   경로: 하위 레코드.unitAnalysisId → AsIsUnitAnalysis → AsIsOverviewItem → AsIsOverview.projectId
 * - [id] 라우트는 레코드를 찾은 뒤 이 함수로 projectId 를 얻고 assertProjectAccess(projectId, user) 로 멤버를 확인한다.
 * - 단위업무 분석이 없으면 null 을 돌려준다 (호출부에서 404).
 * - 목록(GET) · 생성(POST) 라우트는 요청으로 받은 부모 id(overviewId · overviewItemId · unitAnalysisId)를
 *   assertAsIsAccess(종류, id, user) 에 넘긴다. 부모가 없으면 404, 그 프로젝트 멤버 · ADMIN 이 아니면 403 응답을 돌려준다.
 *   회귀: 이 라우트들은 로그인만 확인해서, 부모 id 만 알면 다른 프로젝트의 AS-IS 자료를 읽고 쓸 수 있었다.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, type AuthUser } from "@/lib/auth";

/**
 * 단위업무 분석 id 로 프로젝트 id 를 찾는다.
 * @param unitAnalysisId AsIsUnitAnalysis.id
 * @returns 프로젝트 id, 단위업무 분석이 없으면 null
 */
export async function getAsIsUnitAnalysisProjectId(unitAnalysisId: string): Promise<string | null> {
  const unitAnalysis = await prisma.asIsUnitAnalysis.findUnique({
    where: { id: unitAnalysisId },
    select: { overviewItem: { select: { overview: { select: { projectId: true } } } } },
  });
  return unitAnalysis?.overviewItem.overview.projectId ?? null;
}

/** AS-IS 부모 레코드 종류 (요청으로 받는 id 의 대상) */
export type AsIsParentKind = "overview" | "overviewItem" | "unitAnalysis";

const NOT_FOUND: Record<AsIsParentKind, string> = {
  overview: "AS-IS 총괄을 찾을 수 없습니다.",
  overviewItem: "AS-IS 항목을 찾을 수 없습니다.",
  unitAnalysis: "단위업무 분석을 찾을 수 없습니다.",
};

/**
 * 부모 레코드 id 로 프로젝트 id 를 찾는다.
 * @returns 프로젝트 id, 레코드가 없으면 null
 */
export async function getAsIsParentProjectId(kind: AsIsParentKind, id: string): Promise<string | null> {
  if (kind === "unitAnalysis") return getAsIsUnitAnalysisProjectId(id);
  if (kind === "overviewItem") {
    const item = await prisma.asIsOverviewItem.findUnique({
      where: { id },
      select: { overview: { select: { projectId: true } } },
    });
    return item?.overview.projectId ?? null;
  }
  const overview = await prisma.asIsOverview.findUnique({ where: { id }, select: { projectId: true } });
  return overview?.projectId ?? null;
}

/**
 * 요청으로 받은 AS-IS 부모 id 가 가리키는 프로젝트의 멤버인지 확인한다.
 * @returns 통과하면 null, 아니면 응답 (id 가 문자열이 아니면 400, 부모가 없으면 404, 멤버가 아니면 403)
 */
export async function assertAsIsAccess(kind: AsIsParentKind, id: unknown, user: AuthUser): Promise<NextResponse | null> {
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const projectId = await getAsIsParentProjectId(kind, id);
  if (!projectId) return NextResponse.json({ error: NOT_FOUND[kind] }, { status: 404 });
  return assertProjectAccess(projectId, user);
}
