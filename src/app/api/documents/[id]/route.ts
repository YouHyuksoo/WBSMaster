/**
 * @file src/app/api/documents/[id]/route.ts
 * @description
 * 문서 단건 조회, 수정, 삭제 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/documents/[id]: 단건 조회
 * - PATCH /api/documents/[id]: 수정
 * - DELETE /api/documents/[id]: 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 문서 단건 조회
 * GET /api/documents/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
    const { error } = await requireAuth();
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
    const { error } = await requireAuth();
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
