/**
 * @file src/lib/document-files.test.ts
 * @description
 * 문서함 서버 업로드 규칙(확장자 · 내려받기 헤더 · 저장 경로 제한)과 스트림 저장(200MB 한도)을 검사합니다.
 *
 * 초보자 가이드:
 * - 디스크 쓰기는 OS 임시 폴더에서만 한다 (프로젝트 uploads 폴더를 건드리지 않는다).
 * - resolveDocumentFile 은 DB filePath 가 문서 폴더 밖(../.env.local 등)을 가리키면 null 이어야 한다.
 */
// @vitest-environment node

import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import { mkdtemp, readFile, readdir, rm } from "fs/promises";
import {
  FileTooLargeError,
  contentDisposition,
  documentFilePath,
  documentFileType,
  fileExtension,
  formatFileSize,
  resolveDocumentFile,
  writeStreamToFile,
} from "./document-files";

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(c));
      controller.close();
    },
  });
}

describe("문서 파일 규칙", () => {
  it("허용 확장자만 Content-Type 을 준다 (m4a 는 되고 실행 · html · svg 는 안 된다)", () => {
    expect(documentFileType("음성 261117_151027.m4a")).toBe("audio/mp4");
    expect(documentFileType("보고서.HWP")).toBe("application/x-hwp");
    expect(documentFileType("a.exe")).toBeNull();
    expect(documentFileType("a.html")).toBeNull();
    expect(documentFileType("a.svg")).toBeNull();
    expect(documentFileType("확장자없음")).toBeNull();
    expect(fileExtension("C:\\temp\\x.PDF")).toBe("pdf");
    expect(fileExtension(".env")).toBe("");
  });

  it("한글 파일명은 filename* 로 인코딩하고, pdf 만 바로 열며 그 외는 내려받는다", () => {
    const m4a = contentDisposition("음성 261117.m4a", "m4a", false);
    expect(m4a.startsWith("attachment;")).toBe(true);
    expect(m4a).toContain(`filename*=UTF-8''${encodeURIComponent("음성 261117.m4a")}`);
    expect(m4a).not.toMatch(/[^\x20-\x7e]/);
    expect(contentDisposition("a.pdf", "pdf", false).startsWith("inline;")).toBe(true);
    expect(contentDisposition("a.pdf", "pdf", true).startsWith("attachment;")).toBe(true);
    expect(contentDisposition('a"b.txt', "txt", false)).toContain('filename="a_b.txt"');
  });

  it("문서 폴더 밖을 가리키는 경로는 읽지 않는다", () => {
    const ok = documentFilePath("proj", "doc", "pdf", 1);
    expect(ok).toBe("private/documents/proj/doc/1.pdf");
    expect(resolveDocumentFile(ok)).not.toBeNull();
    expect(resolveDocumentFile("../.env.local")).toBeNull();
    expect(resolveDocumentFile("private/documents/../../.env.local")).toBeNull();
    expect(resolveDocumentFile("avatars/u/1.jpg")).toBeNull();
    expect(resolveDocumentFile("private/chat-intake/x.png")).toBeNull();
    expect(resolveDocumentFile(null)).toBeNull();
  });

  it("formatFileSize", () => {
    expect(formatFileSize(67645354)).toBe("64.5MB");
    expect(formatFileSize(2048)).toBe("2KB");
    expect(formatFileSize(200 * 1024 * 1024)).toBe("200MB");
  });
});

describe("writeStreamToFile", () => {
  it("스트림을 파일로 쓰고 바이트 수를 돌려준다", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "docfile-"));
    try {
      const target = path.join(dir, "sub", "a.bin");
      const size = await writeStreamToFile(streamOf([new Uint8Array([1, 2, 3]), new Uint8Array([4])]), target, 10);
      expect(size).toBe(4);
      expect([...(await readFile(target))]).toEqual([1, 2, 3, 4]);
      expect(await readdir(path.join(dir, "sub"))).toEqual(["a.bin"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("한도를 넘으면 FileTooLargeError 를 던지고 조각 파일을 남기지 않는다", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "docfile-"));
    try {
      const target = path.join(dir, "big.bin");
      await expect(writeStreamToFile(streamOf([new Uint8Array(6), new Uint8Array(6)]), target, 10)).rejects.toBeInstanceOf(FileTooLargeError);
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
