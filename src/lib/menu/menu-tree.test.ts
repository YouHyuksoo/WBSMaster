/**
 * @file src/lib/menu/menu-tree.test.ts
 * @description 좌측 메뉴 조립 규칙(비활성 그룹 · 미배치 · 권한 흐림 · ADMIN 전용)과 권한 그룹 만들기를 검증합니다.
 * 초보자 가이드:
 * - 실제 DB 없이 트리 입력만으로 검사한다.
 */
import { describe, expect, it } from "vitest";
import { buildSidebarGroups, canAccessMenu, type TreeInput } from "./menu-tree";
import { MENU_REGISTRY } from "./menu-config";
import { buildPermissionGroups } from "@/app/dashboard/role-admin/components/PermissionTree";

const tree: TreeInput[] = [
  { code: "SYSTEM", label: "시스템관리", icon: "settings", sortOrder: 20, isActive: true,
    menus: [{ menuCode: "SYS_MENU", sortOrder: 20 }, { menuCode: "SETTINGS", sortOrder: 10 }] },
  { code: "__ROOT__", label: "메뉴", icon: null, sortOrder: 0, isActive: true,
    menus: [{ menuCode: "WBS", sortOrder: 20 }, { menuCode: "DASHBOARD", sortOrder: 10 }, { menuCode: "NOT_IN_CODE", sortOrder: 30 }] },
  { code: "HIDDEN", label: "숨김", icon: null, sortOrder: 10, isActive: false, menus: [{ menuCode: "TASK", sortOrder: 10 }] },
];

describe("좌측 메뉴 조립", () => {
  it("순서대로 그리고, 비활성 그룹 · 등록부에 없는 코드는 뺀다", () => {
    const groups = buildSidebarGroups(tree, null, true);
    expect(groups.map((g) => g.code)).toEqual(["__ROOT__", "SYSTEM"]);
    expect(groups[0].isRoot).toBe(true);
    expect(groups[0].menus.map((m) => m.code)).toEqual(["DASHBOARD", "WBS"]);
    expect(groups[1].menus.map((m) => m.code)).toEqual(["SETTINGS", "SYS_MENU"]);
  });

  it("허용되지 않은 메뉴는 disabled, ADMIN 전용 메뉴는 ADMIN 이 아니면 숨긴다", () => {
    const groups = buildSidebarGroups(tree, ["DASHBOARD", "SETTINGS"], false);
    expect(groups[0].menus.map((m) => [m.code, m.disabled])).toEqual([["DASHBOARD", false], ["WBS", true]]);
    expect(groups[1].menus.map((m) => m.code)).toEqual(["SETTINGS"]);
  });

  it("트리를 아직 못 받으면 처음 배치로 그린다", () => {
    const groups = buildSidebarGroups(null, undefined, false);
    expect(groups[0].code).toBe("__ROOT__");
    expect(groups[0].menus[0].code).toBe("DASHBOARD");
    expect(groups.flatMap((g) => g.menus).some((m) => m.systemOnly)).toBe(false);
  });

  it("canAccessMenu: ADMIN 전부, ADMIN 전용은 다른 역할 불가, 권한 미수신은 막지 않음", () => {
    expect(canAccessMenu("SYS_ROLE", null, true)).toBe(true);
    expect(canAccessMenu("SYS_ROLE", ["SYS_ROLE"], false)).toBe(false);
    expect(canAccessMenu("WBS", undefined, false)).toBe(true);
    expect(canAccessMenu("WBS", [], false)).toBe(false);
    expect(canAccessMenu("UNKNOWN", null, true)).toBe(false);
  });
});

describe("권한 관리 그룹", () => {
  it("배치 순서대로 묶고 배치되지 않은 메뉴는 미배치 묶음으로 붙인다", () => {
    const groups = buildPermissionGroups([{ code: "__ROOT__", label: "메뉴", menus: [{ menuCode: "DASHBOARD" }] }], MENU_REGISTRY);
    expect(groups[0]).toMatchObject({ code: "__ROOT__", label: "단독 메뉴" });
    expect(groups[1].code).toBe("__UNASSIGNED__");
    expect(groups[1].menus).toHaveLength(MENU_REGISTRY.length - 1);
  });
});
