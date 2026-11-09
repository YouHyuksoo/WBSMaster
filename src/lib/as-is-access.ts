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
 */

import { prisma } from "@/lib/prisma";

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
