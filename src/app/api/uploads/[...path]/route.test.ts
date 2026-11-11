// @vitest-environment node
/**
 * @file src/app/api/uploads/[...path]/route.test.ts
 * @description 비공개 업무 문서가 공개 이미지 경로로 조회되지 않는지 확인합니다.
 * 초보자 가이드: 실제 파일을 쓰지 않고 파일 읽기 함수를 주입합니다.
 */
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("fs/promises", () => ({ readFile: vi.fn(async () => Buffer.from("image")) }));
import { readFile } from "fs/promises";
import { GET } from "./route";
beforeEach(() => vi.clearAllMocks());
it.each([["private", "chat", "sample.png"], ["avatars", "..", "private", "chat", "sample.png"]])("비공개 경로는 확장자가 이미지여도 차단한다: %j", async (...segments) => {
  const result = await GET({} as never, { params: Promise.resolve({ path: segments }) });
  expect(result.status).toBe(404); expect(readFile).not.toHaveBeenCalled();
});
it("기존 아바타 이미지는 계속 제공한다", async () => {
  const result = await GET({} as never, { params: Promise.resolve({ path: ["avatars", "u1", "image.png"] }) });
  expect(result.status).toBe(200); expect(readFile).toHaveBeenCalledTimes(1);
});
