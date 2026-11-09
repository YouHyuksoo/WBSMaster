/**
 * @file src/app/api/documents/[id]/route.ts
 * @description
 * 문서 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/documents/[id]: 단건 조회
 * - PATCH /api/documents/[id]: 수정
 * - DELETE /api/documents/[id]: 삭제
 * - 인증: requireAuth + assertProjectAccess (문서의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 *   개인문서(isPersonal)는 작성자 본인만 조회 · 수정 · 삭제할 수 있다
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 문서 단건 조회
 * GET /api/documents/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
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

    if (!document) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(document.projectId, user!);
    if (denied) return denied;
    // 개인문서는 작성자 본인만 (목록 API 와 같은 기준)
    if (document.isPersonal && document.createdById !== user!.id) {
      return NextResponse.json(
        { error: "문서에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("문서 조회 실패:", error);
    return NextResponse.json(
      { error: "문서를 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 문서 수정
 * PATCH /api/documents/[id]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) {
      return error;
    }

    const { id } = await params;
    const body = await request.json();

    // 기존 문서 확인
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existingDocument.projectId, user!);
    if (denied) return denied;
    // 개인문서는 작성자 본인만 (목록 API 와 같은 기준)
    if (existingDocument.isPersonal && existingDocument.createdById !== user!.id) {
      return NextResponse.json(
        { error: "문서에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 수정 가능한 필드만 추출
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "description",
      "category",
      "version",
      "sourceType",
      "url",
      "filePath",
      "fileName",
      "fileSize",
      "mimeType",
      "tags",
      "isFavorite",
      "order",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(document);
  } catch (error) {
    console.error("문서 수정 실패:", error);
    return NextResponse.json(
      { error: "문서를 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

/**
 * 문서 삭제
 * DELETE /api/documents/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error } = await requireAuth();
    if (error) {
      return error;
    }

    const { id } = await params;

    // 기존 문서 확인
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const denied = await assertProjectAccess(existingDocument.projectId, user!);
    if (denied) return denied;
    // 개인문서는 작성자 본인만 (목록 API 와 같은 기준)
    if (existingDocument.isPersonal && existingDocument.createdById !== user!.id) {
      return NextResponse.json(
        { error: "문서에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 서버 업로드 파일인 경우 파일 삭제 로직 추가 가능
    // (현재는 DB 레코드만 삭제)

    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("문서 삭제 실패:", error);
    return NextResponse.json(
      { error: "문서를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
