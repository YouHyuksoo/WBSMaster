/**
 * @file src/lib/document-file-rules.ts
 * @description
 * 문서함 "서버 업로드" 파일의 규칙(허용 확장자 · 200MB 한도 · 내려받기 헤더)입니다. 화면과 서버가 같이 씁니다.
 *
 * 초보자 가이드:
 * - Node 모듈(fs · path)을 쓰지 않는다. 화면 컴포넌트에서도 import 하기 때문이다 (디스크 저장은 document-files.ts).
 * - 허용 형식을 바꾸면 DOCUMENT_FILE_TYPES 한 곳만 고친다. 화면의 파일 선택 accept · 안내 문구도 여기서 만든다.
 */

/** 파일 하나의 최대 크기: 200MB */
export const MAX_DOCUMENT_FILE_BYTES = 200 * 1024 * 1024;

/** 허용 확장자 → Content-Type */
export const DOCUMENT_FILE_TYPES: Record<string, string> = {
  // 문서
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  // 이미지
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  // 음성 · 영상
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
  webm: "audio/webm",
  aiff: "audio/aiff",
  mp4: "video/mp4",
  mov: "video/quicktime",
  // 압축
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
};

/** 브라우저에서 바로 열어도 되는 형식 (그 외는 내려받기). html · svg 는 넣지 않는다 */
const INLINE_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "gif", "webp"]);

/** 화면 안내용 허용 확장자 목록 */
export const DOCUMENT_FILE_EXTENSIONS = Object.keys(DOCUMENT_FILE_TYPES);

/** 파일명에서 소문자 확장자 (없으면 "") */
export function fileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** 허용 확장자면 Content-Type, 아니면 null */
export function documentFileType(fileName: string): string | null {
  return DOCUMENT_FILE_TYPES[fileExtension(fileName)] ?? null;
}

/** 바이트 → "67.6MB" 같은 표시 문자열 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Number((bytes / 1024).toFixed(1))}KB`;
  return `${Number((bytes / 1024 / 1024).toFixed(1))}MB`; // 200.0 → 200
}

/** 내려받기 응답 헤더의 Content-Disposition (한글 이름은 RFC 5987 filename*) */
export function contentDisposition(fileName: string, ext: string, download: boolean): string {
  const type = !download && INLINE_EXTENSIONS.has(ext) ? "inline" : "attachment";
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || `file.${ext}`;
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

