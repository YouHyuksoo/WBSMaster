/**
 * @file src/lib/menu/menu-service.ts
 * @description
 * 메뉴 관리 서버 로직: 그룹 · 배치(메뉴 관리), 역할별 접근(권한 관리), 즐겨찾기 · 폴더.
 *
 * 초보자 가이드:
 * 1. 라우트(src/app/api/menu/**)는 인증 · 입력 형식만 보고 여기 함수를 부른다.
 * 2. 실패는 MenuError(status, message) 로 던지고, 라우트가 같은 상태 코드로 돌려준다.
 * 3. '__ROOT__' 그룹은 만들거나 지우거나 이름 · 아이콘 · 사용 여부를 바꿀 수 없다 (순서만).
 * 4. 메뉴 코드는 menu-config.ts 등록부에 있는 것만 받는다. ADMIN 전용(systemOnly) 메뉴는 다른 역할에 줄 수 없다.
 * 5. ADMIN 은 권한 행과 관계없이 모든 메뉴를 쓴다 (allowedMenusFor 가 null = 전부).
 */

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MENU_REGISTRY, ROOT_CATEGORY, findMenu, isKnownMenuCode } from "./menu-config";

export class MenuError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const FAVORITE_LIMIT = 30;
export const EDITABLE_ROLES: UserRole[] = ["USER", "GUEST"];
const CATEGORY_CODE = /^[A-Z][A-Z0-9_]{1,49}$/;

export interface MenuTreeCategory {
  code: string;
  label: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  menus: Array<{ menuCode: string; sortOrder: number }>;
}

// ---------------- 그룹 · 배치 ----------------

/** 전체 트리 (비활성 그룹 포함, 순서대로) */
export async function getMenuTree(): Promise<MenuTreeCategory[]> {
  const cats = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: { items: { orderBy: [{ sortOrder: "asc" }, { menuCode: "asc" }], select: { menuCode: true, sortOrder: true } } },
  });
  return cats.map((c) => ({ code: c.code, label: c.label, icon: c.icon, sortOrder: c.sortOrder, isActive: c.isActive, menus: c.items }));
}

/** 어느 그룹에도 없는 등록부 메뉴 */
export async function getUnassignedMenus(): Promise<string[]> {
  const placed = new Set((await prisma.menuCategoryItem.findMany({ select: { menuCode: true } })).map((i) => i.menuCode));
  return MENU_REGISTRY.filter((m) => !placed.has(m.code)).map((m) => m.code);
}

function cleanLabel(value: unknown): string {
  const label = String(value ?? "").trim();
  if (!label || label.length > 50) throw new MenuError(400, "그룹 이름은 1~50자로 입력하세요.");
  return label;
}

function cleanIcon(value: unknown): string | null {
  const icon = String(value ?? "").trim();
  if (!icon) return null;
  if (!/^[a-z0-9_]{1,50}$/.test(icon)) throw new MenuError(400, "아이콘은 Material Symbols 이름(영문 소문자 · 숫자 · _)으로 입력하세요.");
  return icon;
}

export async function createCategory(input: { code?: unknown; label?: unknown; icon?: unknown; isActive?: unknown }) {
  const code = String(input.code ?? "").trim().toUpperCase();
  if (code === ROOT_CATEGORY) throw new MenuError(400, "__ROOT__ 는 예약된 그룹이라 만들 수 없습니다.");
  if (!CATEGORY_CODE.test(code)) throw new MenuError(400, "그룹 코드는 영문 대문자로 시작하는 2~50자(대문자 · 숫자 · _)입니다.");
  if (await prisma.menuCategory.findUnique({ where: { code } })) throw new MenuError(409, "같은 코드의 그룹이 이미 있습니다.");
  const last = await prisma.menuCategory.aggregate({ _max: { sortOrder: true } });
  return prisma.menuCategory.create({
    data: { code, label: cleanLabel(input.label), icon: cleanIcon(input.icon), isActive: input.isActive !== false, sortOrder: (last._max.sortOrder ?? 0) + 10 },
  });
}

export async function updateCategory(code: string, input: { label?: unknown; icon?: unknown; isActive?: unknown }) {
  if (code === ROOT_CATEGORY) throw new MenuError(400, "__ROOT__ 그룹은 이름 · 아이콘 · 사용 여부를 바꿀 수 없습니다.");
  if (!(await prisma.menuCategory.findUnique({ where: { code } }))) throw new MenuError(404, "그룹을 찾을 수 없습니다.");
  return prisma.menuCategory.update({
    where: { code },
    data: {
      ...("label" in input && { label: cleanLabel(input.label) }),
      ...("icon" in input && { icon: cleanIcon(input.icon) }),
      ...("isActive" in input && { isActive: Boolean(input.isActive) }),
    },
  });
}

/** 비어 있는 그룹만 지운다 */
export async function deleteCategory(code: string) {
  if (code === ROOT_CATEGORY) throw new MenuError(400, "__ROOT__ 그룹은 지울 수 없습니다.");
  const cat = await prisma.menuCategory.findUnique({ where: { code }, include: { _count: { select: { items: true } } } });
  if (!cat) throw new MenuError(404, "그룹을 찾을 수 없습니다.");
  if (cat._count.items > 0) throw new MenuError(409, "메뉴가 남아 있는 그룹은 지울 수 없습니다. 메뉴를 다른 그룹으로 옮기거나 미배치로 내보내세요.");
  await prisma.menuCategory.delete({ where: { code } });
}

function orderList<T extends string>(value: unknown, key: T): Array<Record<T, string> & { sortOrder: number }> {
  if (!Array.isArray(value)) throw new MenuError(400, "순서 목록이 필요합니다.");
  return value.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const id = String(r[key] ?? "");
    const sortOrder = Number(r.sortOrder);
    if (!id || !Number.isInteger(sortOrder)) throw new MenuError(400, "순서 목록 형식이 올바르지 않습니다.");
    return { [key]: id, sortOrder } as Record<T, string> & { sortOrder: number };
  });
}

export async function reorderCategories(value: unknown) {
  const list = orderList(value, "code");
  await prisma.$transaction(list.map((c) => prisma.menuCategory.update({ where: { code: c.code }, data: { sortOrder: c.sortOrder } })));
}

export async function reorderItems(categoryCode: string, value: unknown) {
  const list = orderList(value, "menuCode");
  const own = await prisma.menuCategoryItem.findMany({ where: { categoryCode }, select: { menuCode: true } });
  const ownSet = new Set(own.map((i) => i.menuCode));
  if (list.some((i) => !ownSet.has(i.menuCode))) throw new MenuError(400, "이 그룹에 없는 메뉴가 들어 있습니다.");
  await prisma.$transaction(list.map((i) => prisma.menuCategoryItem.update({ where: { menuCode: i.menuCode }, data: { sortOrder: i.sortOrder } })));
}

/** 메뉴를 그룹으로 옮긴다 (toCategoryCode 가 없으면 미배치로 내보낸다). 맨 끝에 붙인다 */
export async function moveMenu(input: { menuCode?: unknown; toCategoryCode?: unknown }) {
  const menuCode = String(input.menuCode ?? "");
  if (!isKnownMenuCode(menuCode)) throw new MenuError(400, "등록되지 않은 메뉴 코드입니다.");
  const to = input.toCategoryCode ? String(input.toCategoryCode) : null;
  if (!to) {
    await prisma.menuCategoryItem.deleteMany({ where: { menuCode } });
    return;
  }
  if (!(await prisma.menuCategory.findUnique({ where: { code: to } }))) throw new MenuError(404, "옮길 그룹을 찾을 수 없습니다.");
  const last = await prisma.menuCategoryItem.aggregate({ where: { categoryCode: to }, _max: { sortOrder: true } });
  const sortOrder = (last._max.sortOrder ?? 0) + 10;
  await prisma.menuCategoryItem.upsert({
    where: { menuCode },
    create: { menuCode, categoryCode: to, sortOrder },
    update: { categoryCode: to, sortOrder },
  });
}

// ---------------- 역할별 권한 ----------------

export function parseRole(value: unknown): UserRole {
  const role = String(value ?? "");
  if (role !== "ADMIN" && role !== "USER" && role !== "GUEST") throw new MenuError(400, "역할은 ADMIN · USER · GUEST 중 하나입니다.");
  return role;
}

/** 역할이 쓸 수 있는 메뉴 코드. ADMIN 은 null(전부) */
export async function allowedMenusFor(role: string): Promise<string[] | null> {
  if (role === "ADMIN") return null;
  const rows = await prisma.roleMenuPermission.findMany({ where: { role: parseRole(role) }, select: { menuCode: true } });
  // 등록부에서 사라졌거나 ADMIN 전용인 메뉴는 권한 행이 있어도 주지 않는다
  return rows.map((r) => r.menuCode).filter((c) => findMenu(c) && !findMenu(c)!.systemOnly);
}

/** 역할 권한 전체 교체 (허용 메뉴만 행으로 저장) */
export async function replacePermissions(roleValue: unknown, menuCodes: unknown): Promise<string[]> {
  const role = parseRole(roleValue);
  if (role === "ADMIN") throw new MenuError(400, "ADMIN 은 모든 메뉴를 쓰므로 권한을 저장하지 않습니다.");
  if (!Array.isArray(menuCodes)) throw new MenuError(400, "menuCodes 배열이 필요합니다.");
  const codes = [...new Set(menuCodes.map(String))];
  const unknown = codes.filter((c) => !isKnownMenuCode(c));
  if (unknown.length) throw new MenuError(400, `등록되지 않은 메뉴 코드: ${unknown.join(", ")}`);
  const system = codes.filter((c) => findMenu(c)!.systemOnly);
  if (system.length) throw new MenuError(400, `ADMIN 전용 메뉴는 다른 역할에 줄 수 없습니다: ${system.join(", ")}`);
  await prisma.$transaction([
    prisma.roleMenuPermission.deleteMany({ where: { role } }),
    prisma.roleMenuPermission.createMany({ data: codes.map((menuCode) => ({ role, menuCode })) }),
  ]);
  return codes;
}

// ---------------- 즐겨찾기 ----------------

export async function getFavorites(userId: string): Promise<string[]> {
  const rows = await prisma.userMenuFavorite.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { menuCode: true } });
  return rows.map((r) => r.menuCode).filter(isKnownMenuCode);
}

/** 즐겨찾기 목록 맞추기: 배열 순서가 순서, 빠진 것은 지우고, 남은 것의 폴더는 유지 */
export async function syncFavorites(userId: string, menuCodes: unknown): Promise<string[]> {
  if (!Array.isArray(menuCodes)) throw new MenuError(400, "menuCodes 배열이 필요합니다.");
  const codes = [...new Set(menuCodes.map(String))];
  if (codes.length > FAVORITE_LIMIT) throw new MenuError(400, `즐겨찾기는 최대 ${FAVORITE_LIMIT}개까지 담을 수 있습니다.`);
  const unknown = codes.filter((c) => !isKnownMenuCode(c));
  if (unknown.length) throw new MenuError(400, `등록되지 않은 메뉴 코드: ${unknown.join(", ")}`);
  await prisma.$transaction([
    prisma.userMenuFavorite.deleteMany({ where: { userId, menuCode: { notIn: codes } } }),
    ...codes.map((menuCode, i) =>
      prisma.userMenuFavorite.upsert({
        where: { userId_menuCode: { userId, menuCode } },
        create: { userId, menuCode, sortOrder: (i + 1) * 10 },
        update: { sortOrder: (i + 1) * 10 },
      })
    ),
  ]);
  return codes;
}

export async function getFolders(userId: string) {
  const [folders, assigned] = await Promise.all([
    prisma.userMenuFavoriteFolder.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, sortOrder: true } }),
    prisma.userMenuFavorite.findMany({ where: { userId, folderId: { not: null } }, select: { menuCode: true, folderId: true } }),
  ]);
  return { folders, assignments: assigned.map((a) => ({ menuCode: a.menuCode, folderId: a.folderId! })) };
}

function cleanFolderName(value: unknown): string {
  const name = String(value ?? "").trim();
  if (!name || name.length > 100) throw new MenuError(400, "폴더 이름은 1~100자로 입력하세요.");
  return name;
}

async function ownFolder(userId: string, id: string) {
  const folder = await prisma.userMenuFavoriteFolder.findUnique({ where: { id } });
  if (!folder || folder.userId !== userId) throw new MenuError(404, "폴더를 찾을 수 없습니다.");
  return folder;
}

export async function createFolder(userId: string, name: unknown) {
  const last = await prisma.userMenuFavoriteFolder.aggregate({ where: { userId }, _max: { sortOrder: true } });
  return prisma.userMenuFavoriteFolder.create({ data: { userId, name: cleanFolderName(name), sortOrder: (last._max.sortOrder ?? 0) + 10 }, select: { id: true, name: true, sortOrder: true } });
}

export async function renameFolder(userId: string, id: string, name: unknown) {
  await ownFolder(userId, id);
  return prisma.userMenuFavoriteFolder.update({ where: { id }, data: { name: cleanFolderName(name) }, select: { id: true, name: true, sortOrder: true } });
}

/** 폴더를 지우면 안의 메뉴는 기본 즐겨찾기로 돌아간다 (FK SET NULL) */
export async function deleteFolder(userId: string, id: string) {
  await ownFolder(userId, id);
  await prisma.userMenuFavoriteFolder.delete({ where: { id } });
}

export async function moveFavoriteToFolder(userId: string, menuCode: string, folderId: unknown) {
  const fav = await prisma.userMenuFavorite.findUnique({ where: { userId_menuCode: { userId, menuCode } } });
  if (!fav) throw new MenuError(404, "즐겨찾기에 없는 메뉴입니다.");
  const target = folderId ? String(folderId) : null;
  if (target) await ownFolder(userId, target);
  await prisma.userMenuFavorite.update({ where: { userId_menuCode: { userId, menuCode } }, data: { folderId: target } });
}
