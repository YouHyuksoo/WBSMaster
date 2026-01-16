/**
 * @file src/app/api/projects/route.ts
 * @description
 * 프로젝트 API 라우트입니다.
 * 프로젝트 목록 조회(GET), 프로젝트 생성(POST)을 처리합니다.
 *
 * WBS 계층적 가중치 기반으로 진행율을 계산하여 반환합니다.
 * - 대분류(LEVEL1)의 가중치를 기준으로 전체 비중 결정
 * - 각 대분류 내 말단 업무들의 평균 진행률 계산
 * - 최종 진행률 = Σ(대분류 평균진행률 × 대분류 weight) / Σ(대분류 weight)
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

/**
 * 프로젝트 목록 조회
 * GET /api/projects
 *
 * 반환 데이터에 WBS 단위업무 기반 진행율 포함:
 * - calculatedProgress: 가중치 기반 계산된 진행율
 * - totalUnitTasks: 총 단위업무 수
 * - completedUnitTasks: 완료된 단위업무 수
 */
export async function GET(request: NextRequest) {
  try {
    // ========== 디버깅 로그 시작 ==========
    console.log("===== [DEBUG] /api/projects GET 시작 =====");
    console.log("[DEBUG] DATABASE_URL 존재:", !!process.env.DATABASE_URL);
    console.log("[DEBUG] DATABASE_URL 앞 50자:", process.env.DATABASE_URL?.substring(0, 50) + "...");
    console.log("[DEBUG] NODE_ENV:", process.env.NODE_ENV);
    // ========== 디버깅 로그 끝 ==========

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const ownerId = searchParams.get("ownerId");

    // 필터 조건 구성
    const where: Prisma.ProjectWhereInput = {};

    if (status && Object.values(ProjectStatus).includes(status)) where.status = status;
    if (ownerId) where.ownerId = ownerId;

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

    // ========== 디버깅 로그 ==========
    console.log("[DEBUG] 프로젝트 조회 결과 개수:", projects.length);
    console.log("[DEBUG] 프로젝트 목록:", projects.map(p => ({ id: p.id, name: p.name })));
    // ========== 디버깅 로그 끝 ==========

    /**
     * 각 프로젝트의 WBS 기반 진행율 계산
     * 계층적 가중치 방식:
     * 1. 대분류(LEVEL1)의 가중치로 전체 비중 결정
     * 2. 각 대분류 내 말단 업무들의 평균 진행률 계산
     * 3. 최종 진행률 = Σ(대분류 평균진행률 × 대분류 weight) / Σ(대분류 weight)
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
       * 각 대분류별 진행률 계산
       * 대분류의 progress 값은 이미 하위 항목들의 가중 평균으로 자동 계산됨
       * 따라서 대분류의 progress를 직접 사용하여 가중치 적용
       *
       * 최종 진행률 = Σ(대분류 progress × 대분류 weight) / Σ(대분류 weight)
       */
      let totalLevel1Weight = 0;
      let weightedLevel1Progress = 0;

      level1Items.forEach((level1Item) => {
        const level1Weight = level1Item.weight || 1;
        totalLevel1Weight += level1Weight;

        // 대분류의 progress 값을 직접 사용 (이미 하위 항목 평균이 반영됨)
        weightedLevel1Progress += level1Item.progress * level1Weight;
      });

      // 최종 진행률 = Σ(대분류 progress × 대분류 weight) / Σ(대분류 weight)
      const calculatedProgress = totalLevel1Weight > 0
        ? Math.round(weightedLevel1Progress / totalLevel1Weight)
        : 0;

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
    // ========== 디버깅 에러 로그 ==========
    console.error("===== [DEBUG] /api/projects 에러 발생 =====");
    console.error("[DEBUG] 에러 타입:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[DEBUG] 에러 메시지:", error instanceof Error ? error.message : String(error));
    console.error("[DEBUG] 에러 스택:", error instanceof Error ? error.stack : "N/A");
    // ========== 디버깅 에러 로그 끝 ==========

    console.error("프로젝트 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "프로젝트 목록을 조회할 수 없습니다.", debug: error instanceof Error ? error.message : String(error) },
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

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("프로젝트 생성 실패:", error);
    return NextResponse.json(
      { error: "프로젝트를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
