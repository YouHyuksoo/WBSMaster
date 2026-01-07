/**
 * @file src/app/api/upload/route.ts
 * @description
 * 이미지 업로드 API입니다.
 * Supabase Storage에 이미지를 업로드하고 URL을 반환합니다.
 *
 * 초보자 가이드:
 * 1. **POST /api/upload**: 이미지 파일 업로드
 *    - FormData로 file 전송
 *    - 업로드된 이미지의 public URL 반환
 *
 * 수정 방법:
 * - 버킷 이름 변경: BUCKET_NAME 상수 수정
 * - 파일 크기 제한 변경: MAX_FILE_SIZE 상수 수정
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

/** 업로드 설정 */
const BUCKET_NAME = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
    if (!ALLOWED_TYPES.includes(file.type)) {
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

    // Supabase Storage에 업로드
    const supabase = await createClient();

    // 버킷 존재 여부 확인 및 생성
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // 버킷이 없으면 생성 (public 버킷으로)
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      });

      if (createError) {
        console.error("버킷 생성 실패:", createError);
        // 버킷 생성 실패해도 업로드 시도 (이미 존재할 수 있음)
      }
    }

    // 파일 이름 생성 (userId_timestamp.extension)
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 업로드
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("업로드 실패:", uploadError);
      return NextResponse.json(
        { error: "파일 업로드에 실패했습니다." },
        { status: 500 }
      );
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("업로드 처리 실패:", error);
    return NextResponse.json(
      { error: "업로드 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
