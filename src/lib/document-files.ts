/**
 * @file src/lib/document-files.ts
 * @description
 * 문서함 "서버 업로드" 파일의 저장 경로와 디스크 저장 · 삭제 함수입니다 (서버 전용). 규칙은 document-file-rules.ts.
 *
 * 초보자 가이드:
 * - 한도는 200MB(MAX_DOCUMENT_FILE_BYTES). 운영은 IIS 의 maxAllowedContentLength 도 이보다 크게 둬야 한다.
 * - 파일은 uploads/private/documents/<프로젝트>/<문서>/ 아래에 둔다. 공개 경로(/api/uploads)는 private/ 를 서빙하지 않으므로
 *   내려받기는 로그인 · 프로젝트 권한을 확인하는 GET /api/documents/[id]/file 로만 한다.
 * - filePath 는 서버만 쓴다 (문서 등록 · 수정 API 는 클라이언트가 보낸 파일 경로를 받지 않는다).
 * - writeStreamToFile: 요청 본문을 메모리에 다 올리지 않고 디스크로 흘려 쓰며, 한도를 넘으면 중단하고 조각 파일을 지운다.
 */

import path from "path";
import { createWriteStream } from "fs";
import { rename, rm, mkdir } from "fs/promises";
import { resolveUploadPath, UPLOAD_ROOT } from "@/lib/uploads";
import { MAX_DOCUMENT_FILE_BYTES, formatFileSize } from "@/lib/document-file-rules";

export * from "@/lib/document-file-rules";

/** 문서 파일 저장 폴더 (업로드 루트 기준) */
export const DOCUMENT_FILE_DIR = "private/documents";

/** 저장 상대경로: private/documents/<projectId>/<documentId>/<시각>.<ext> (원본 이름은 DB fileName 에만 둔다) */
export function documentFilePath(projectId: string, documentId: string, ext: string, now = Date.now()): string {
  return `${DOCUMENT_FILE_DIR}/${projectId}/${documentId}/${now}.${ext}`;
}

/** DB 의 filePath 가 문서 파일 폴더 안을 가리킬 때만 절대경로, 아니면 null */
export function resolveDocumentFile(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const absolute = resolveUploadPath(relativePath);
  const base = path.join(UPLOAD_ROOT, ...DOCUMENT_FILE_DIR.split("/")) + path.sep;
  return absolute && absolute.startsWith(base) ? absolute : null;
}

/** 한도를 넘었을 때 던지는 오류 */
export class FileTooLargeError extends Error {
  constructor() {
    super(`파일은 ${formatFileSize(MAX_DOCUMENT_FILE_BYTES)} 이하만 올릴 수 있습니다.`);
  }
}

/**
 * 스트림을 임시 파일에 쓰고, 다 받으면 목적지로 옮긴다. 한도를 넘거나 실패하면 임시 파일을 지우고 오류를 던진다.
 * @returns 쓴 바이트 수
 */
export async function writeStreamToFile(stream: ReadableStream<Uint8Array>, absolute: string, maxBytes = MAX_DOCUMENT_FILE_BYTES): Promise<number> {
  await mkdir(path.dirname(absolute), { recursive: true });
  const temp = `${absolute}.part`;
  const out = createWriteStream(temp);
  const finished = new Promise<void>((resolve, reject) => {
    out.on("finish", resolve);
    out.on("error", reject);
  });
  let total = 0;
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new FileTooLargeError();
      if (!out.write(value)) await new Promise<void>((resolve) => out.once("drain", resolve));
    }
    out.end();
    await finished;
    await rename(temp, absolute);
    return total;
  } catch (error) {
    reader.cancel().catch(() => {});
    // destroy 는 비동기로 닫힌다. 닫히기(또는 늦게 열리기) 전에 지우면 조각 파일이 남으므로 close 를 기다린다
    if (!out.closed) await new Promise<void>((resolve) => { out.once("close", () => resolve()); out.destroy(); });
    await rm(temp, { force: true });
    throw error;
  }
}

/** 문서 파일 삭제 (없거나 폴더 밖 경로면 아무것도 안 함) */
export async function removeDocumentFile(relativePath: string | null | undefined): Promise<void> {
  const absolute = resolveDocumentFile(relativePath);
  if (absolute) await rm(absolute, { force: true });
}
