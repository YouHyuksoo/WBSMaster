/**
 * @file src/components/layout/FavoriteMenuDropdown.tsx
 * @description
 * 헤더의 "즐겨찾기 (n)" 버튼과 목록입니다 (HANES FavoriteMenuDropdown 과 같은 구성).
 *
 * 초보자 가이드:
 * 1. 좌측 메뉴의 별(★)로 담은 메뉴가 여기 보인다. 폴더(접고 펼침)가 먼저, 그다음 폴더 없는 즐겨찾기
 * 2. 행을 누르면 그 화면으로 이동, 행의 별을 누르면 즐겨찾기에서 뺀다
 * 3. 내 역할에 허용되지 않은 메뉴는 목록에서 뺀다
 * 4. "폴더 관리" 는 FavoriteFolderManager 모달을 연다
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { useCurrentUser, useMenuFavoriteFolders, useMenuFavorites, useMyMenuAccess } from "@/hooks";
import { findMenu, type MenuLeaf } from "@/lib/menu/menu-config";
import { canAccessMenu } from "@/lib/menu/menu-tree";
import { FavoriteFolderManager } from "./FavoriteFolderManager";

export function FavoriteMenuDropdown() {
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [closedFolders, setClosedFolders] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);
  const { data: user } = useCurrentUser();
  const { data: access } = useMyMenuAccess();
  const { favorites, toggle } = useMenuFavorites();
  const { data: folderData } = useMenuFavoriteFolders();

  const menus = useMemo(
    () => favorites.map(findMenu).filter((m): m is MenuLeaf => !!m && canAccessMenu(m.code, access?.allowedMenus, user?.role === "ADMIN")),
    [favorites, access, user]
  );
  const folderOf = useMemo(() => new Map(folderData.assignments.map((a) => [a.menuCode, a.folderId])), [folderData]);
  const unfiled = menus.filter((m) => !folderOf.has(m.code));

  // 바깥을 누르거나 Esc 를 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row = (m: MenuLeaf) => (
    <li key={m.code} className="group/fav flex items-center">
      <Link
        href={m.href}
        onClick={() => setOpen(false)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text dark:text-white hover:bg-surface dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon name={m.icon} size="xs" className="text-text-secondary" />
        <span className="truncate">{m.label}</span>
      </Link>
      <button
        type="button"
        onClick={() => toggle(m.code)}
        aria-label={`${m.label} 즐겨찾기 해제`}
        title="즐겨찾기 해제"
        className="size-7 shrink-0 flex items-center justify-center rounded-md hover:bg-surface dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon name="star" size="xs" className="text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }} />
      </button>
    </li>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        title="즐겨찾기 메뉴"
        className="flex h-9 items-center justify-center gap-1 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark hover:bg-surface-hover dark:hover:bg-[#2a3441] transition-colors px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon name="star" size="sm" className="text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }} />
        <span className="hidden sm:inline text-xs font-bold text-text dark:text-white">즐겨찾기</span>
        <span className="text-xs font-bold text-text-secondary tabular-nums">{menus.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark shadow-lg p-2">
          <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border dark:border-border-dark">
            <p className="text-sm font-bold text-text dark:text-white">즐겨찾기</p>
            <button
              type="button"
              onClick={() => {
                setManagerOpen(true);
                setOpen(false);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <Icon name="create_new_folder" size="xs" />
              폴더 관리
            </button>
          </div>

          {menus.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-text-secondary">좌측 메뉴 옆의 ★ 를 누르면 여기에 담깁니다.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {folderData.folders.map((folder) => {
                const inFolder = menus.filter((m) => folderOf.get(m.code) === folder.id);
                const closed = !!closedFolders[folder.id];
                return (
                  <div key={folder.id}>
                    <button
                      type="button"
                      onClick={() => setClosedFolders((p) => ({ ...p, [folder.id]: !p[folder.id] }))}
                      aria-expanded={!closed}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-text dark:text-white hover:bg-surface dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Icon name={closed ? "folder" : "folder_open"} size="xs" className="text-text-secondary" />
                      <span className="flex-1 truncate">{folder.name}</span>
                      <span className="text-xs text-text-secondary tabular-nums">{inFolder.length}</span>
                    </button>
                    {!closed && inFolder.length > 0 && <ul className="ml-4 pl-2 border-l border-border dark:border-border-dark">{inFolder.map(row)}</ul>}
                  </div>
                );
              })}
              {unfiled.length > 0 && <ul>{unfiled.map(row)}</ul>}
            </div>
          )}
        </div>
      )}

      <FavoriteFolderManager isOpen={managerOpen} onClose={() => setManagerOpen(false)} menus={menus} />
    </div>
  );
}
