/**
 * @file src/lib/menu/menu-service.test.ts
 * @description 메뉴 관리 서버 규칙(예약 그룹 · 코드 형식 · ADMIN 전용 메뉴 · 즐겨찾기 한도 · 남의 폴더)을 가짜 prisma 로 검증합니다.
 * 초보자 가이드:
 * - 실제 DB 에 쓰지 않는다. prisma 호출은 목으로 바꿔 규칙만 본다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  menuCategory: { findUnique: vi.fn(), aggregate: vi.fn(), create: vi.fn(), delete: vi.fn() },
  roleMenuPermission: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
  userMenuFavorite: { deleteMany: vi.fn(), upsert: vi.fn() },
  userMenuFavoriteFolder: { findUnique: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import {
  FAVORITE_LIMIT, allowedMenusFor, createCategory, deleteCategory, deleteFolder, replacePermissions, syncFavorites,
} from "./menu-service";

beforeEach(() => vi.clearAllMocks());

describe("그룹 규칙", () => {
  it("__ROOT__ · 잘못된 코드 · 중복 코드는 만들지 않는다", async () => {
    await expect(createCategory({ code: "__ROOT__", label: "x" })).rejects.toMatchObject({ status: 400 });
    await expect(createCategory({ code: "1abc", label: "x" })).rejects.toMatchObject({ status: 400 });
    db.menuCategory.findUnique.mockResolvedValueOnce({ code: "QUALITY" });
    await expect(createCategory({ code: "quality", label: "품질" })).rejects.toMatchObject({ status: 409 });
  });

  it("코드는 대문자로 바꿔 맨 끝 순서로 만든다", async () => {
    db.menuCategory.findUnique.mockResolvedValueOnce(null);
    db.menuCategory.aggregate.mockResolvedValueOnce({ _max: { sortOrder: 20 } });
    await createCategory({ code: "quality", label: " 품질 ", icon: "verified" });
    expect(db.menuCategory.create).toHaveBeenCalledWith({ data: { code: "QUALITY", label: "품질", icon: "verified", isActive: true, sortOrder: 30 } });
  });

  it("메뉴가 남은 그룹 · __ROOT__ 는 지우지 않는다", async () => {
    await expect(deleteCategory("__ROOT__")).rejects.toMatchObject({ status: 400 });
    db.menuCategory.findUnique.mockResolvedValueOnce({ code: "SYSTEM", _count: { items: 2 } });
    await expect(deleteCategory("SYSTEM")).rejects.toMatchObject({ status: 409 });
    expect(db.menuCategory.delete).not.toHaveBeenCalled();
  });
});

describe("역할 권한 규칙", () => {
  it("ADMIN 역할 · ADMIN 전용 메뉴 · 등록되지 않은 코드는 저장하지 않는다", async () => {
    await expect(replacePermissions("ADMIN", ["WBS"])).rejects.toMatchObject({ status: 400 });
    await expect(replacePermissions("USER", ["SYS_ROLE"])).rejects.toMatchObject({ status: 400 });
    await expect(replacePermissions("USER", ["NOPE"])).rejects.toMatchObject({ status: 400 });
    await expect(replacePermissions("BOSS", ["WBS"])).rejects.toMatchObject({ status: 400 });
    expect(db.roleMenuPermission.deleteMany).not.toHaveBeenCalled();
  });

  it("허용 메뉴만 행으로 통째 교체한다 (중복 제거)", async () => {
    expect(await replacePermissions("GUEST", ["WBS", "WBS", "DASHBOARD"])).toEqual(["WBS", "DASHBOARD"]);
    expect(db.roleMenuPermission.deleteMany).toHaveBeenCalledWith({ where: { role: "GUEST" } });
    expect(db.roleMenuPermission.createMany).toHaveBeenCalledWith({ data: [{ role: "GUEST", menuCode: "WBS" }, { role: "GUEST", menuCode: "DASHBOARD" }] });
  });

  it("ADMIN 은 전부(null), 다른 역할은 ADMIN 전용 · 사라진 코드를 걸러 준다", async () => {
    expect(await allowedMenusFor("ADMIN")).toBeNull();
    db.roleMenuPermission.findMany.mockResolvedValueOnce([{ menuCode: "WBS" }, { menuCode: "SYS_MENU" }, { menuCode: "OLD" }]);
    expect(await allowedMenusFor("USER")).toEqual(["WBS"]);
  });
});

describe("즐겨찾기 규칙", () => {
  it(`최대 ${FAVORITE_LIMIT}개, 등록되지 않은 코드는 거절`, async () => {
    const many = Array.from({ length: FAVORITE_LIMIT + 1 }, (_, i) => `X${i}`);
    await expect(syncFavorites("u1", many)).rejects.toMatchObject({ status: 400 });
    await expect(syncFavorites("u1", ["NOPE"])).rejects.toMatchObject({ status: 400 });
  });

  it("배열 순서대로 10 단위 순서를 매기고 빠진 것은 지운다", async () => {
    await syncFavorites("u1", ["WBS", "TASK"]);
    expect(db.userMenuFavorite.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", menuCode: { notIn: ["WBS", "TASK"] } } });
    expect(db.userMenuFavorite.upsert.mock.calls.map((c) => c[0].update.sortOrder)).toEqual([10, 20]);
  });

  it("남의 폴더는 지울 수 없다 (404)", async () => {
    db.userMenuFavoriteFolder.findUnique.mockResolvedValueOnce({ id: "f1", userId: "other" });
    await expect(deleteFolder("u1", "f1")).rejects.toMatchObject({ status: 404 });
    expect(db.userMenuFavoriteFolder.delete).not.toHaveBeenCalled();
  });
});
