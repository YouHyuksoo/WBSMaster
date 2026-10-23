/**
 * @file src/app/api/uploads/[...path]/route.ts
 * @description
 * 로컬 디스크에 저장된 업로드 파일(아바타 이미지 등)을 서빙하는 API입니다.
 *
 * 초보자 가이드:
 * 1. **GET /api/uploads/avatars/<userId>/123.jpg**: 파일 반환
 * 2. **공개 접근**: 기존 Supabase public 버킷과 동일하게 인증 없이 조회 가능
 * 3. **허용 형식**: 이미지 확장자만 서빙 (CONTENT_TYPES)
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { CONTENT_TYPES, resolveUploadPath } from "@/lib/uploads";

type RouteParams = { params: Promise<{ path: string[] }> };

/**
 * 업로드 파일 조회
 * GET /api/uploads/[...path]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path: segments } = await params;
  const absolute = resolveUploadPath(segments.join("/"));
  const ext = path.extname(segments[segments.length - 1] ?? "").slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  if (!absolute || !contentType) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const data = await readFile(absolute);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        // 파일명에 타임스탬프가 포함되어 내용이 바뀌지 않으므로 장기 캐시
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
}
