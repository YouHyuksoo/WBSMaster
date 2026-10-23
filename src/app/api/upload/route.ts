/**
 * @file src/app/api/upload/route.ts
 * @description
 * 이미지 업로드 API입니다.
 * 서버 로컬 디스크(uploads/)에 이미지를 저장하고 URL을 반환합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/upload**: 이미지 파일 업로드
 *    - FormData로 file 전송
 *    - 업로드된 이미지의 URL(/api/uploads/...) 반환
 * 2. **저장 위치**: src/lib/uploads.ts의 UPLOAD_ROOT (기본 <프로젝트>/uploads)
 *
 * 수정 방법:
 * - 저장 폴더 변경: AVATAR_FOLDER 상수 수정
 * - 파일 크기 제한 변경: MAX_FILE_SIZE 상수 수정
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IMAGE_EXTENSIONS, saveUpload } from "@/lib/uploads";

/** 업로드 설정 */
const AVATAR_FOLDER = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 이미지 업로드
 * POST /api/upload
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const fileExt = IMAGE_EXTENSIONS[file.type];
    if (!fileExt) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. (jpg, png, webp, gif만 가능)" },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일 경로 생성 (avatars/<userId>/<timestamp>.<ext>)
    const filePath = `${AVATAR_FOLDER}/${user!.id}/${Date.now()}.${fileExt}`;

    // 로컬 디스크에 저장
    const url = await saveUpload(filePath, new Uint8Array(await file.arrayBuffer()));

    return NextResponse.json({ url });
  } catch (error) {
    console.error("업로드 처리 실패:", error);
    return NextResponse.json(
      { error: "업로드 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
