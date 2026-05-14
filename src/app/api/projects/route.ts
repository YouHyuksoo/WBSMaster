/**
 * @file src/app/api/projects/route.ts
 * @description
 * 프로젝트 API 라우트입니다.
 * 프로젝트 목록 조회(GET), 프로젝트 생성(POST)을 처리합니다.
 *
 * WBS 엑셀 산식 기반으로 진행율을 계산하여 반환합니다.
 * - 대분류(LEVEL1)별 하위 말단 항목들의 평균 진행률 계산
 * - 최종 진행률 = Σ(대분류 가중치 × 대분류 말단평균진행률) / 100
 * - 소수점 첫째자리까지 반올림 (WBS 페이지와 동일)
 *
 * 초보자 가이드:
 * 1. **GET /api/projects**: 모든 프로젝트 목록 조회 (WBS 기반 진행율 포함)
 * 2. **POST /api/projects**: 새 프로젝트 생성
 *
 * 수정 방법:
 * - 필터링 추가: GET에서 searchParams 처리
 * - 필드 추가: POST의 body에서 새 필드 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_ETC_STAGES } from "@/lib/stage-categories";

/**
 * 프로젝트 목록 조회
 * GET /api/projects
 *
 * 반환 데이터에 WBS 단위업무 기반 진행율 포함:
 * - calculatedProgress: WBS 엑셀 산식 기반 진행율 (소수점 1자리)
 * - totalUnitTasks: 총 단위업무 수
 * - completedUnitTasks: 완료된 단위업무 수
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const ownerId = searchParams.get("ownerId");
    const accessibleOnly = searchParams.get("accessibleOnly") !== "false"; // 기본 true

    // 필터 조건 구성
    const where: Prisma.ProjectWhereInput = {};

    if (status && Object.values(ProjectStatus).includes(status)) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    // accessibleOnly: ADMIN은 전체, 그 외는 멤버십 보유 프로젝트만
    if (accessibleOnly && user!.role !== "ADMIN") {
      where.teamMembers = { some: { userId: user!.id } };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        // 모든 WBS 항목 조회 (leaf nodes 판별을 위해)
        wbsItems: {
          select: {
            id: true,
            parentId: true,
            level: true,
            progress: true,
            weight: true,
            status: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            requirements: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    /**
     * 각 프로젝트의 WBS 기반 진행율 계산 (WBS 엑셀 산식과 동일)
     * 1. 대분류(LEVEL1)별 하위 말단 항목들의 평균 진행률 계산
     * 2. 최종 진행률 = Σ(대분류 가중치 × 대분류 말단평균진행률) / 100
     * 3. 소수점 첫째자리까지 반올림
     */
    const projectsWithCalculatedProgress = projects.map((project) => {
      const allWbsItems = project.wbsItems || [];

      // WBS 항목이 없으면 기존 progress 사용
      if (allWbsItems.length === 0) {
        return {
          ...project,
          calculatedProgress: project.progress,
          totalUnitTasks: 0,
          completedUnitTasks: 0,
        };
      }

      // 자식이 있는 항목의 ID 집합 (parentId로 참조되는 항목들)
      const parentIds = new Set(
        allWbsItems
          .filter((item) => item.parentId !== null)
          .map((item) => item.parentId)
      );

      // 말단 업무 = 자식이 없는 항목 (parentIds에 없는 항목)
      const leafItems = allWbsItems.filter((item) => !parentIds.has(item.id));
      const totalUnitTasks = leafItems.length;

      // 말단 업무가 없으면 기존 progress 사용
      if (totalUnitTasks === 0) {
        return {
          ...project,
          calculatedProgress: project.progress,
          totalUnitTasks: 0,
          completedUnitTasks: 0,
        };
      }

      // 대분류(LEVEL1) 항목들
      const level1Items = allWbsItems.filter((item) => item.level === "LEVEL1");

      // 대분류가 없으면 기존 방식(말단 업무 개별 가중치)으로 계산
      if (level1Items.length === 0) {
        const totalWeight = leafItems.reduce((sum, item) => sum + (item.weight || 1), 0);
        const weightedProgress = leafItems.reduce((sum, item) => {
          const weight = item.weight || 1;
          return sum + (item.progress * weight);
        }, 0);
        const calculatedProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
        const completedUnitTasks = leafItems.filter((item) => item.progress === 100).length;

        return {
          ...project,
          calculatedProgress,
          totalUnitTasks,
          completedUnitTasks,
        };
      }

      /**
       * 특정 항목의 모든 자손(하위 항목) ID를 재귀적으로 수집
       */
      const getDescendantIds = (parentId: string): Set<string> => {
        const descendants = new Set<string>();
        const children = allWbsItems.filter((item) => item.parentId === parentId);

        children.forEach((child) => {
          descendants.add(child.id);
          const childDescendants = getDescendantIds(child.id);
          childDescendants.forEach((id) => descendants.add(id));
        });

        return descendants;
      };

      /**
       * 각 대분류별 진행률 계산 (WBS 엑셀 산식과 동일)
       * 각 대분류의 하위 말단 항목들의 평균 진행률을 구한 뒤, 가중치 적용
       *
       * 최종 진행률 = Σ(대분류 가중치 × 대분류 말단평균진행률) / 100
       */
      let totalLevel1Weight = 0;
      let actualProgress = 0;

      level1Items.forEach((level1Item) => {
        const level1Weight = level1Item.weight || 0;
        totalLevel1Weight += level1Weight;

        // 해당 대분류의 하위 말단 항목들 수집
        const descendantIds = getDescendantIds(level1Item.id);
        const level1LeafItems = leafItems.filter(
          (item) => descendantIds.has(item.id) || item.id === level1Item.id
        );

        // 대분류 자체가 말단(하위 없음)인 경우
        const effectiveLeafItems = level1LeafItems.length > 0
          ? level1LeafItems
          : (!parentIds.has(level1Item.id) ? [level1Item] : []);

        // 대분류 평균 진행률
        const avgProgressLevel1 = effectiveLeafItems.length > 0
          ? effectiveLeafItems.reduce((sum, i) => sum + i.progress, 0) / effectiveLeafItems.length
          : 0;

        // 실적 진척률: 가중치 × 평균진행률 / 100
        actualProgress += (level1Weight * avgProgressLevel1) / 100;
      });

      // 소수점 첫째자리까지 반올림 (WBS 페이지와 동일)
      const calculatedProgress = Math.round(actualProgress * 10) / 10;

      // 완료된 말단 업무 수 (progress가 100인 것)
      const completedUnitTasks = leafItems.filter((item) => item.progress === 100).length;

      return {
        ...project,
        calculatedProgress,
        totalUnitTasks,
        completedUnitTasks,
      };
    });

    return NextResponse.json(projectsWithCalculatedProgress);
  } catch (error) {
    console.error("프로젝트 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "프로젝트 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 프로젝트 생성
 * POST /api/projects
 * (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: "프로젝트 이름은 필수입니다." },
        { status: 400 }
      );
    }

    // 소유자 ID는 현재 로그인한 사용자
    const ownerId = user!.id;

    // 사용자가 users 테이블에 없으면 자동 생성
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {}, // 이미 있으면 아무것도 안함
      create: {
        id: ownerId,
        email: user!.email,
        name: user!.name || null,
        avatar: user!.avatar || null,
      },
    });

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId,
        status: "PLANNING",
        progress: 0,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // 프로젝트 생성자를 팀 멤버로 자동 추가 (OWNER 역할)
    await prisma.teamMember.create({
      data: {
        projectId: project.id,
        userId: ownerId,
        role: "OWNER",
      },
    });

    // ETC 카테고리에 기본 10단계 자동 시드
    await prisma.progressStageDef.createMany({
      data: DEFAULT_ETC_STAGES.map((name, idx) => ({
        projectId: project.id,
        category: "ETC" as const,
        name,
        order: idx,
      })),
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("프로젝트 생성 실패:", error);
    return NextResponse.json(
      { error: "프로젝트를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
