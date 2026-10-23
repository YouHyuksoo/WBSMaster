/**
 * @file src/lib/uploads.ts
 * @description
 * 업로드 파일(아바타 이미지 등)을 서버 로컬 디스크에 저장/조회하는 헬퍼입니다.
 * Supabase Storage를 대체합니다.
 *
 * 초보자 가이드:
 * 1. **저장 위치**: UPLOAD_DIR 환경변수, 없으면 `<프로젝트>/uploads`
 *    - Next.js는 빌드 후 public/에 추가된 파일을 서빙하지 않으므로 별도 폴더를 사용
 * 2. **공개 URL**: `/api/uploads/<상대경로>` (src/app/api/uploads/[...path]/route.ts가 서빙)
 * 3. **보안**: resolveUploadPath가 업로드 폴더 밖으로 나가는 경로(../)를 차단
 */

import path from "path";
import { mkdir, writeFile } from "fs/promises";

/** 업로드 루트 폴더 */
export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
);

/** 업로드 파일 공개 URL prefix */
export const UPLOAD_URL_PREFIX = "/api/uploads";

/** 허용 이미지 MIME → 확장자 */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** 확장자 → Content-Type */
export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * 상대경로를 업로드 폴더 안의 절대경로로 변환
 * 업로드 폴더 밖을 가리키면 null 반환
 */
export function resolveUploadPath(relativePath: string): string | null {
  const absolute = path.resolve(UPLOAD_ROOT, relativePath);
  if (!absolute.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return absolute;
}

/**
 * 파일 저장 후 공개 URL 반환
 * @param relativePath 업로드 폴더 기준 상대경로, `/` 구분 (예: avatars/<userId>/123.jpg)
 */
export async function saveUpload(relativePath: string, data: Uint8Array): Promise<string> {
  const absolute = resolveUploadPath(relativePath);
  if (!absolute) throw new Error("잘못된 업로드 경로입니다.");

  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, data);

  return `${UPLOAD_URL_PREFIX}/${relativePath}`;
}
