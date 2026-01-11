/**
 * @file src/app/api/documents/route.ts
 * @description
 * 문서함 목록 조회 및 생성 API입니다.
 * 프로젝트 내 공용문서함과 개인문서함을 지원합니다.
 *
 * 초보자 가이드:
 * - GET /api/documents: 목록 조회 (필터링 지원)
 *   - isPersonal=true: 개인문서함 (프로젝트 내 본인 문서만)
 *   - isPersonal=false: 공용문서함 (프로젝트 내 모든 공용 문서)
 * - POST /api/documents: 새 문서 등록
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * 문서 목록 조회
 * GET /api/documents
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) {
      return error;
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category");
    const sourceType = searchParams.get("sourceType");
    const search = searchParams.get("search");
    const favoriteOnly = searchParams.get("favoriteOnly") === "true";
    const isPersonal = searchParams.get("isPersonal") === "true";

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    // 프로젝트 필터
    if (projectId) {
      where.projectId = projectId;
    }

    // 공용/개인 구분
    where.isPersonal = isPersonal;

    // 개인문서함은 본인 문서만
    if (isPersonal) {
      where.createdById = user!.id;
    }

    if (category) {
      where.category = category;
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (favoriteOnly) {
      where.isFavorite = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { isFavorite: "desc" },
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("문서 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "문서 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 문서 생성
 * POST /api/documents
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) {
      return error;
    }

    const body = await request.json();
    const {
      projectId,
      name,
      description,
      category,
      version,
      sourceType,
      url,
      filePath,
      fileName,
      fileSize,
      mimeType,
      tags,
      isPersonal = false,
    } = body;

    // 필수 필드 검증
    if (!projectId || !name || !category || !sourceType) {
      return NextResponse.json(
        { error: "프로젝트, 문서명, 종류, 소스 타입은 필수입니다." },
        { status: 400 }
      );
    }

    // 소스 타입에 따른 검증
    if ((sourceType === "ONEDRIVE" || sourceType === "GOOGLE" || sourceType === "EXTERNAL_LINK") && !url) {
      return NextResponse.json(
        { error: "외부 링크 문서는 URL이 필수입니다." },
        { status: 400 }
      );
    }

    // 가장 큰 order 값 조회 (프로젝트 + 공용/개인별로)
    const lastDocument = await prisma.document.findFirst({
      where: {
        projectId,
        isPersonal,
        ...(isPersonal ? { createdById: user!.id } : {}),
      },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const newOrder = (lastDocument?.order || 0) + 1;

    const document = await prisma.document.create({
      data: {
        projectId,
        name,
        description: description || null,
        category,
        version: version || "1.0",
        sourceType,
        url: url || null,
        filePath: filePath || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        tags: tags || [],
        order: newOrder,
        isPersonal,
        createdById: user!.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("문서 생성 실패:", error);
    return NextResponse.json(
      { error: "문서를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
