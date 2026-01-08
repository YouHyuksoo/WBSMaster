/**
 * @file src/app/api/issues/stats/route.ts
 * @description
 * 이슈 통계 API입니다.
 * 카테고리별 분포, 해결/미해결 건수 등을 반환합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/issues/stats**: 이슈 통계 조회
 *    - ?projectId=xxx: 특정 프로젝트만 (선택)
 *    - 없으면 모든 프로젝트 통합 통계
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/** 카테고리 라벨 매핑 */
const categoryLabels: Record<string, string> = {
  BUG: "버그",
  IMPROVEMENT: "개선",
  QUESTION: "문의",
  FEATURE: "신규기능",
  DOCUMENTATION: "문서",
  OTHER: "기타",
};

/**
 * 이슈 통계 조회
 * GET /api/issues/stats
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // 사용자가 속한 프로젝트 찾기
    const userProjects = await prisma.teamMember.findMany({
      where: { userId: user!.id },
      select: { projectId: true },
    });

    const projectIds = userProjects.map((p) => p.projectId);

    // 프로젝트 필터 조건
    const projectFilter = projectId
      ? { projectId }
      : { projectId: { in: projectIds } };

    // 이슈 목록 조회
    const issues = await prisma.issue.findMany({
      where: projectFilter,
      select: {
        id: true,
        status: true,
        category: true,
        priority: true,
      },
    });

    // 카테고리별 통계
    const categoryStats = new Map<string, { resolved: number; unresolved: number }>();

    // 전체 통계
    let totalStats = {
      total: issues.length,
      resolved: 0,   // RESOLVED + CLOSED
      unresolved: 0, // OPEN + IN_PROGRESS
      open: 0,
      inProgress: 0,
      closed: 0,
    };

    // 이슈 순회
    issues.forEach((issue) => {
      const isResolved = issue.status === "RESOLVED" || issue.status === "CLOSED";

      // 전체 통계
      if (issue.status === "OPEN") totalStats.open++;
      else if (issue.status === "IN_PROGRESS") totalStats.inProgress++;
      else if (issue.status === "RESOLVED") totalStats.resolved++;
      else if (issue.status === "CLOSED") totalStats.closed++;

      if (isResolved) {
        totalStats.resolved++;
      } else {
        totalStats.unresolved++;
      }

      // 카테고리별 통계
      const category = issue.category;
      const existing = categoryStats.get(category);

      if (existing) {
        if (isResolved) {
          existing.resolved++;
        } else {
          existing.unresolved++;
        }
      } else {
        categoryStats.set(category, {
          resolved: isResolved ? 1 : 0,
          unresolved: isResolved ? 0 : 1,
        });
      }
    });

    // 카테고리별 배열로 변환
    const categoryList = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        label: categoryLabels[category] || category,
        ...stats,
        total: stats.resolved + stats.unresolved,
      }))
      .sort((a, b) => b.total - a.total); // 총 건수 높은 순

    // resolved 중복 계산 수정 (RESOLVED와 CLOSED를 별도로 카운트하고 있어서)
    totalStats.resolved = issues.filter(
      (i) => i.status === "RESOLVED" || i.status === "CLOSED"
    ).length;
    totalStats.unresolved = issues.filter(
      (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
    ).length;

    return NextResponse.json({
      categories: categoryList,
      total: totalStats,
      projectCount: projectId ? 1 : projectIds.length,
    });
  } catch (error) {
    console.error("이슈 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "이슈 통계를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
