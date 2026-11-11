/**
 * @file src/app/api/upload/route.test.ts
 * @description 문서 업로드의 프로젝트 권한과 기존 이미지 경로 호환성을 확인합니다.
 * 초보자 가이드: 디스크·DB·AI를 목 처리하여 실제 자료를 만들지 않습니다.
 */
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ denied: null as Response | null }));
vi.mock("@/lib/auth", () => ({ requireAuth: async () => ({ user: { id: "u1" }, error: null }), assertProjectAccess: vi.fn(async () => state.denied) }));
vi.mock("@/lib/chat-intake/attachments", () => ({ uploadIntakeAttachment: vi.fn(async () => ({ attachmentId: "a1" })) }));
vi.mock("@/lib/uploads", () => ({ IMAGE_EXTENSIONS: { "image/png": "png" }, saveUpload: vi.fn(async () => "/api/uploads/avatars/u1/a.png") }));
import { uploadIntakeAttachment } from "@/lib/chat-intake/attachments";
import { saveUpload } from "@/lib/uploads";
import { POST } from "./route";
const post = (data: Record<string, unknown>) => POST({ formData: async () => ({ get: (key: string) => data[key] }) } as never);
beforeEach(() => { vi.clearAllMocks(); state.denied = null; });
it("프로젝트 권한이 없으면 추출·저장하지 않는다", async () => {
  state.denied = new Response("{}", { status: 403 });
  expect((await post({ purpose: "chat_intake", projectId: "other", file: new File(["sample"], "a.txt") })).status).toBe(403);
  expect(uploadIntakeAttachment).not.toHaveBeenCalled();
});
it("문서는 비공개 식별자만 반환한다", async () => {
  const res = await post({ purpose: "chat_intake", projectId: "p1", file: new File(["sample"], "a.txt") });
  expect(await res.json()).toEqual({ attachmentId: "a1" }); expect(saveUpload).not.toHaveBeenCalled();
});
it("기존 이미지 업로드는 공개 URL 계약을 유지한다", async () => {
  const res = await post({ file: { type: "image/png", size: 1, arrayBuffer: async () => new ArrayBuffer(1) } });
  expect(await res.json()).toEqual({ url: "/api/uploads/avatars/u1/a.png" });
});
