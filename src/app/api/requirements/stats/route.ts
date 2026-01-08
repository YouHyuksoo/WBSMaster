/**
 * @file src/app/api/requirements/stats/route.ts
 * @description
 * 요구사항 통계 API입니다.
 * 담당자별 처리 현황, 상태별 분포 등을 반환합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/requirements/stats**: 요구사항 통계 조회
 *    - ?projectId=xxx: 특정 프로젝트만 (선택)
 *    - 없으면 모든 프로젝트 통합 통계
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/** 상태 라벨 매핑 */
const statusLabels: Record<string, string> = {
  DRAFT: "초안",
  APPROVED: "승인",
  REJECTED: "반려",
  IMPLEMENTED: "구현완료",
};

/**
 * 요구사항 통계 조회
 * GET /api/requirements/stats
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

    // 요구사항 목록 조회
    const requirements = await prisma.requirement.findMany({
      where: projectFilter,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 담당자별 통계
    const assigneeStats = new Map<
      string,
      {
        id: string;
        name: string;
        email?: string;
        avatar?: string;
        total: number;
        draft: number;
        approved: number;
        rejected: number;
        implemented: number;
      }
    >();

    // 미할당 통계
    let unassigned = {
      total: 0,
      draft: 0,
      approved: 0,
      rejected: 0,
      implemented: 0,
    };

    // 전체 통계
    let totalStats = {
      total: requirements.length,
      draft: 0,
      approved: 0,
      rejected: 0,
      implemented: 0,
    };

    // 요구사항 순회
    requirements.forEach((req) => {
      // 전체 통계
      if (req.status === "DRAFT") totalStats.draft++;
      else if (req.status === "APPROVED") totalStats.approved++;
      else if (req.status === "REJECTED") totalStats.rejected++;
      else if (req.status === "IMPLEMENTED") totalStats.implemented++;

      // 담당자가 없는 경우
      if (!req.assignee) {
        unassigned.total++;
        if (req.status === "DRAFT") unassigned.draft++;
        else if (req.status === "APPROVED") unassigned.approved++;
        else if (req.status === "REJECTED") unassigned.rejected++;
        else if (req.status === "IMPLEMENTED") unassigned.implemented++;
        return;
      }

      // 담당자별 통계
      const assigneeId = req.assignee.id;
      const existing = assigneeStats.get(assigneeId);

      if (existing) {
        existing.total++;
        if (req.status === "DRAFT") existing.draft++;
        else if (req.status === "APPROVED") existing.approved++;
        else if (req.status === "REJECTED") existing.rejected++;
        else if (req.status === "IMPLEMENTED") existing.implemented++;
      } else {
        assigneeStats.set(assigneeId, {
          id: assigneeId,
          name: req.assignee.name || req.assignee.email || "알 수 없음",
          email: req.assignee.email || undefined,
          avatar: req.assignee.avatar || undefined,
          total: 1,
          draft: req.status === "DRAFT" ? 1 : 0,
          approved: req.status === "APPROVED" ? 1 : 0,
          rejected: req.status === "REJECTED" ? 1 : 0,
          implemented: req.status === "IMPLEMENTED" ? 1 : 0,
        });
      }
    });

    // 담당자별 배열로 변환 (완료율 높은 순)
    const assigneeList = Array.from(assigneeStats.values())
      .map((stat) => ({
        ...stat,
        // 처리율 (구현완료 + 승인) / 전체
        completionRate:
          stat.total > 0
            ? Math.round(((stat.implemented + stat.approved) / stat.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate);

    // 미할당 추가 (있는 경우)
    if (unassigned.total > 0) {
      assigneeList.push({
        id: "unassigned",
        name: "미할당",
        email: undefined,
        avatar: undefined,
        ...unassigned,
        completionRate:
          unassigned.total > 0
            ? Math.round(
                ((unassigned.implemented + unassigned.approved) / unassigned.total) * 100
              )
            : 0,
      });
    }

    // 상태별 분포 (차트용)
    const statusDistribution = [
      { status: "DRAFT", label: "초안", count: totalStats.draft, color: "#94a3b8" },
      { status: "APPROVED", label: "승인", count: totalStats.approved, color: "#3b82f6" },
      { status: "REJECTED", label: "반려", count: totalStats.rejected, color: "#ef4444" },
      { status: "IMPLEMENTED", label: "구현완료", count: totalStats.implemented, color: "#22c55e" },
    ];

    return NextResponse.json({
      assignees: assigneeList,
      statusDistribution,
      total: totalStats,
      projectCount: projectId ? 1 : projectIds.length,
    });
  } catch (error) {
    console.error("요구사항 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "요구사항 통계를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
