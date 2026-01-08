/**
 * @file src/app/api/wbs/route.ts
 * @description
 * WBS(Work Breakdown Structure) 항목 API 라우트입니다.
 * 계층형 WBS 구조를 지원합니다 (대분류 > 중분류 > 소분류 > 단위업무).
 *
 * 초보자 가이드:
 * 1. **GET /api/wbs**: 프로젝트별 WBS 목록 조회 (트리 구조)
 *    - ?projectId=xxx: 특정 프로젝트의 WBS 조회
 *    - ?flat=true: 평탄화된 목록으로 조회
 * 2. **POST /api/wbs**: 새 WBS 항목 생성
 *
 * WBS 레벨 설명:
 * - LEVEL1: 대분류 (분석, 설계, 개발, 테스트, 이행)
 * - LEVEL2: 중분류 (요구사항 분석, 화면 설계 등)
 * - LEVEL3: 소분류 (기능 요구사항, 비기능 요구사항 등)
 * - LEVEL4: 단위업무 (실제 작업 항목)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WbsLevel, Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

/** WBS 레벨별 숫자 매핑 */
const levelToNumber: Record<WbsLevel, number> = {
  LEVEL1: 1,
  LEVEL2: 2,
  LEVEL3: 3,
  LEVEL4: 4,
};

/**
 * WBS 항목을 트리 구조로 변환
 * @param items - 평탄화된 WBS 항목 배열
 * @returns 트리 구조의 WBS 항목 배열
 */
function buildWbsTree(items: any[]): any[] {
  const itemMap = new Map<string, any>();
  const roots: any[] = [];

  // 먼저 모든 항목을 맵에 저장
  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // 부모-자식 관계 구성
  items.forEach((item) => {
    const node = itemMap.get(item.id);
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 각 레벨에서 order로 정렬
  const sortChildren = (nodes: any[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

/**
 * WBS 목록 조회
 * GET /api/wbs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const flat = searchParams.get("flat") === "true";
    const parentId = searchParams.get("parentId");

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 필터 조건 구성
    const where: Prisma.WbsItemWhereInput = { projectId };

    // 특정 부모의 자식만 조회할 경우
    if (parentId) {
      where.parentId = parentId;
    }

    const wbsItems = await prisma.wbsItem.findMany({
      where,
      include: {
        // 담당자 조회
        assignees: {
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
        // 자식 수 카운트용 (트리 접기/펼치기에 사용)
        _count: {
          select: { children: true },
        },
      },
      orderBy: [
        { level: "asc" },
        { order: "asc" },
        { code: "asc" },
      ],
    });

    // 응답 형식 변환
    const transformedItems = wbsItems.map((item) => ({
      ...item,
      assignees: item.assignees.map((a) => a.user),
      hasChildren: item._count.children > 0,
      levelNumber: levelToNumber[item.level],
    }));

    // 평탄화 요청이면 그대로 반환
    if (flat) {
      return NextResponse.json(transformedItems);
    }

    // 트리 구조로 변환
    const tree = buildWbsTree(transformedItems);
    return NextResponse.json(tree);
  } catch (error) {
    console.error("WBS 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "WBS 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 다음 WBS 코드 생성
 * 부모가 있으면 부모코드.N, 없으면 N
 */
async function generateWbsCode(
  projectId: string,
  parentId: string | null,
  parentCode: string | null
): Promise<string> {
  // 같은 부모 아래의 마지막 항목 찾기
  const lastSibling = await prisma.wbsItem.findFirst({
    where: {
      projectId,
      parentId: parentId || null,
    },
    orderBy: { order: "desc" },
    select: { code: true, order: true },
  });

  if (parentCode) {
    // 부모가 있는 경우: 부모코드.N
    const nextOrder = (lastSibling?.order ?? -1) + 1;
    return `${parentCode}.${nextOrder + 1}`;
  } else {
    // 최상위 항목: N
    const nextOrder = (lastSibling?.order ?? -1) + 1;
    return `${nextOrder + 1}`;
  }
}

/**
 * WBS 항목 생성
 * POST /api/wbs
 * (인증 필요)
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const {
      name,
      description,
      projectId,
      parentId,
      level,
      assigneeIds,
      startDate,
      endDate,
      weight,
      deliverableName,
      deliverableLink,
    } = body;

    // 필수 필드 검증
    if (!name || !projectId || !level) {
      return NextResponse.json(
        { error: "항목명, 프로젝트 ID, 레벨은 필수입니다." },
        { status: 400 }
      );
    }

    // 레벨 검증
    if (!Object.values(WbsLevel).includes(level)) {
      return NextResponse.json(
        { error: "유효하지 않은 레벨입니다. (LEVEL1, LEVEL2, LEVEL3, LEVEL4)" },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 부모 항목 확인 (있는 경우)
    let parentCode: string | null = null;
    if (parentId) {
      const parent = await prisma.wbsItem.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json(
          { error: "부모 항목을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      parentCode = parent.code;

      // 부모 레벨 + 1이 현재 레벨이어야 함
      const parentLevelNum = levelToNumber[parent.level];
      const currentLevelNum = levelToNumber[level as WbsLevel];
      if (currentLevelNum !== parentLevelNum + 1) {
        return NextResponse.json(
          { error: `부모 레벨(${parent.level}) 바로 아래 레벨만 추가할 수 있습니다.` },
          { status: 400 }
        );
      }
    } else {
      // 부모가 없으면 LEVEL1이어야 함
      if (level !== "LEVEL1") {
        return NextResponse.json(
          { error: "최상위 항목은 LEVEL1이어야 합니다." },
          { status: 400 }
        );
      }
    }

    // WBS 코드 생성
    const code = await generateWbsCode(projectId, parentId || null, parentCode);

    // 같은 부모 아래의 순서 결정
    const siblingCount = await prisma.wbsItem.count({
      where: { projectId, parentId: parentId || null },
    });

    // 담당자 배열 준비
    const assigneesData = Array.isArray(assigneeIds) && assigneeIds.length > 0
      ? assigneeIds.map((userId: string) => ({ userId }))
      : [];

    // WBS 항목 생성
    const wbsItem = await prisma.wbsItem.create({
      data: {
        code,
        name,
        description,
        level: level as WbsLevel,
        order: siblingCount,
        projectId,
        parentId: parentId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        weight: weight || 1,
        deliverableName: deliverableName || null,
        deliverableLink: deliverableLink || null,
        assignees: {
          create: assigneesData,
        },
      },
      include: {
        assignees: {
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
        _count: {
          select: { children: true },
        },
      },
    });

    // 응답 형식 변환
    const transformedItem = {
      ...wbsItem,
      assignees: wbsItem.assignees.map((a) => a.user),
      hasChildren: wbsItem._count.children > 0,
      levelNumber: levelToNumber[wbsItem.level],
    };

    return NextResponse.json(transformedItem, { status: 201 });
  } catch (error) {
    console.error("WBS 항목 생성 실패:", error);

    // Unique constraint 에러 처리
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 같은 코드의 WBS 항목이 존재합니다." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "WBS 항목을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
