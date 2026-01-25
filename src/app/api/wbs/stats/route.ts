/**
 * @file src/app/api/wbs/stats/route.ts
 * @description
 * WBS 담당자 기준 통계 API입니다.
 * 레벨에 관계없이 담당자가 배정된 모든 WBS 항목의 진행률을 집계합니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/wbs/stats**: 담당자별 WBS 진행률 조회
 *    - ?projectId=xxx: 특정 프로젝트만 (선택)
 *    - 없으면 모든 프로젝트 통합 통계
 *
 * 집계 방식:
 * - LEVEL4(단위업무)뿐만 아니라 담당자가 배정된 모든 레벨의 WBS 항목 포함
 * - 소그룹(LEVEL3)에만 담당자가 있어도 집계됨
 * - 담당자가 없는 항목은 "미할당"으로 별도 집계
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * WBS 단위업무 기반 통계 조회
 * GET /api/wbs/stats
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

    // 담당자가 배정된 모든 WBS 항목 조회 (레벨 무관)
    // 담당자가 있는 항목만 집계하여 중복 방지
    const wbsItems = await prisma.wbsItem.findMany({
      where: {
        ...projectFilter,
        // 담당자가 최소 1명 이상 있는 항목만 조회
        assignees: {
          some: {},
        },
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 담당자가 없는 항목도 별도로 조회 (미할당 집계용)
    const unassignedItems = await prisma.wbsItem.findMany({
      where: {
        ...projectFilter,
        // 담당자가 없는 항목
        assignees: {
          none: {},
        },
        // 말단 노드만 (자식이 없는 항목) - 미할당은 작업 가능한 말단 항목만 의미있음
        children: {
          none: {},
        },
      },
      select: {
        id: true,
        status: true,
        progress: true,
        endDate: true,
      },
    });

    // 담당자별 통계 계산
    const assigneeStats = new Map<
      string,
      {
        id: string;
        name: string;
        email?: string;
        avatar?: string;
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        totalProgress: number; // 진행률 합계 (평균 계산용)
      }
    >();

    // 미할당 통계 (담당자가 없는 말단 항목)
    let unassigned = {
      total: unassignedItems.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      totalProgress: 0,
    };

    // 전체 통계 (담당자 배정된 항목 + 미할당 말단 항목)
    let totalStats = {
      total: wbsItems.length + unassignedItems.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      delayed: 0, // 지연건수 (종료일이 지났는데 완료되지 않은 업무)
      totalProgress: 0, // 전체 항목의 진행률 합계 (평균 진행률 계산용)
    };

    // 오늘 날짜 (시간 제외, 날짜만 비교)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 미할당 항목 통계 계산
    unassignedItems.forEach((item) => {
      unassigned.totalProgress += item.progress;
      totalStats.totalProgress += item.progress; // 전체 진행률 합계에도 추가
      if (item.status === "COMPLETED") {
        unassigned.completed++;
        totalStats.completed++;
      } else if (item.status === "IN_PROGRESS") {
        unassigned.inProgress++;
        totalStats.inProgress++;
      } else {
        unassigned.pending++;
        totalStats.pending++;
      }

      // 지연 체크
      if (item.endDate && item.status !== "COMPLETED") {
        const endDate = new Date(item.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < today) {
          totalStats.delayed++;
        }
      }
    });

    // 담당자 배정된 WBS 항목 순회
    wbsItems.forEach((item) => {
      // 전체 통계 업데이트
      totalStats.totalProgress += item.progress; // 전체 진행률 합계에 추가
      if (item.status === "COMPLETED") {
        totalStats.completed++;
      } else if (item.status === "IN_PROGRESS") {
        totalStats.inProgress++;
      } else {
        totalStats.pending++;
      }

      // 지연 체크: 종료일이 오늘보다 이전이고 완료되지 않은 경우
      if (item.endDate && item.status !== "COMPLETED") {
        const endDate = new Date(item.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < today) {
          totalStats.delayed++;
        }
      }

      // 담당자별 통계 (담당자가 있는 항목만 조회했으므로 항상 존재)
      item.assignees.forEach((assignee) => {
        const userId = assignee.user.id;
        const existing = assigneeStats.get(userId);

        if (existing) {
          existing.total++;
          existing.totalProgress += item.progress;
          if (item.status === "COMPLETED") {
            existing.completed++;
          } else if (item.status === "IN_PROGRESS") {
            existing.inProgress++;
          } else {
            existing.pending++;
          }
        } else {
          assigneeStats.set(userId, {
            id: userId,
            name: assignee.user.name || assignee.user.email || "알 수 없음",
            email: assignee.user.email || undefined,
            avatar: assignee.user.avatar || undefined,
            total: 1,
            completed: item.status === "COMPLETED" ? 1 : 0,
            inProgress: item.status === "IN_PROGRESS" ? 1 : 0,
            pending: item.status === "PENDING" ? 1 : 0,
            totalProgress: item.progress,
          });
        }
      });
    });

    // 담당자별 진행률 계산 및 정렬
    const assigneeList = Array.from(assigneeStats.values())
      .map((stat) => ({
        ...stat,
        // 평균 진행률 계산
        avgProgress: stat.total > 0 ? Math.round(stat.totalProgress / stat.total) : 0,
        // 완료율 계산 (완료된 업무 / 전체 업무)
        completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
      }))
      .sort((a, b) => b.avgProgress - a.avgProgress); // 평균 진행률 높은 순

    // 미할당 추가 (있는 경우)
    if (unassigned.total > 0) {
      assigneeList.push({
        id: "unassigned",
        name: "미할당",
        email: undefined,
        avatar: undefined,
        total: unassigned.total,
        completed: unassigned.completed,
        inProgress: unassigned.inProgress,
        pending: unassigned.pending,
        totalProgress: unassigned.totalProgress,
        avgProgress:
          unassigned.total > 0 ? Math.round(unassigned.totalProgress / unassigned.total) : 0,
        completionRate:
          unassigned.total > 0 ? Math.round((unassigned.completed / unassigned.total) * 100) : 0,
      });
    }

    return NextResponse.json({
      assignees: assigneeList,
      total: totalStats,
      projectCount: projectId ? 1 : projectIds.length,
    });
  } catch (error) {
    console.error("WBS 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "WBS 통계를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
