/**
 * @file src/lib/__tests__/auth.test.ts
 * @description assertProjectAccess 헬퍼의 권한 판단 로직 단위 테스트
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";

// prisma 모킹
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");
const { assertProjectAccess } = await import("@/lib/auth");

const adminUser: AuthUser = {
  id: "u-admin",
  email: "a@a.com",
  name: "관리자",
  avatar: null,
  role: "ADMIN",
};

const normalUser: AuthUser = {
  id: "u-1",
  email: "u@u.com",
  name: "일반",
  avatar: null,
  role: "USER",
};

describe("assertProjectAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADMIN은 멤버십 검사 없이 통과한다", async () => {
    const result = await assertProjectAccess("p-1", adminUser);
    expect(result).toBeNull();
    expect(prisma.teamMember.findUnique).not.toHaveBeenCalled();
  });

  it("일반 사용자가 멤버인 경우 통과한다", async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue({ id: "m-1" });
    const result = await assertProjectAccess("p-1", normalUser);
    expect(result).toBeNull();
  });

  it("일반 사용자가 비멤버인 경우 403 응답을 반환한다", async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue(null);
    const result = await assertProjectAccess("p-1", normalUser);
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.status).toBe(403);
  });
});
