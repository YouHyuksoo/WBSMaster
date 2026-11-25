/**
 * @file src/lib/uploads-read-only.test.ts
 * @description 로컬 서버가 운영 DB 에 붙은 동안(UPLOADS_READ_ONLY=1) 업로드 폴더에 쓰지 않는지 검사합니다.
 * 초보자 가이드: 업로드 폴더에 쓰는 라우트(resolveUploadPath · saveUpload 를 쓰고 파일을 저장)는 uploadsBlockedReason 을 확인해야 한다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { saveUpload, uploadsBlockedReason } from "./uploads";

afterEach(() => vi.unstubAllEnvs());

it("켜지지 않으면 막지 않는다", () => {
  vi.stubEnv("UPLOADS_READ_ONLY", "");
  expect(uploadsBlockedReason()).toBeNull();
});
it("켜지면 저장을 거부하고 이유를 알린다", async () => {
  vi.stubEnv("UPLOADS_READ_ONLY", "1");
  await expect(saveUpload("avatars/x.png", new Uint8Array())).rejects.toThrow(/운영 주소/);
});
it("업로드 폴더에 쓰는 라우트는 먼저 확인한다", () => {
  for (const f of ["upload", "documents/[id]/file", "voice-intake/[jobId]/document"]) {
    expect(readFileSync(join(process.cwd(), "src/app/api", f, "route.ts"), "utf8"), f).toContain("uploadsBlockedReason()");
  }
});
