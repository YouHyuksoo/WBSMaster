/**
 * @file src/components/layout/FavoriteFolderManager.tsx
 * @description
 * 즐겨찾기 폴더 관리 모달: 폴더 만들기 · 이름 바꾸기 · 지우기, 즐겨찾기 메뉴를 폴더로 옮기기 (HANES FavoriteFolderManager 와 같음).
 *
 * 초보자 가이드:
 * 1. 위쪽 입력칸: 새 폴더 이름 → "폴더 만들기". 이름 바꾸기를 누르면 같은 칸이 "이름 저장" 으로 바뀐다
 * 2. 폴더 삭제는 한 번 더 확인한다. 안의 메뉴는 기본 즐겨찾기로 돌아간다
 * 3. 아래쪽: 즐겨찾기 메뉴마다 폴더를 고른다 ("기본 즐겨찾기" = 폴더 없음)
 */

"use client";

import { useState } from "react";
import { Button, Icon, Modal } from "@/components/ui";
import { useMenuFavoriteFolders } from "@/hooks";
import type { MenuLeaf } from "@/lib/menu/menu-config";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** 즐겨찾기 메뉴 (권한 있는 것만) */
  menus: MenuLeaf[];
}

export function FavoriteFolderManager({ isOpen, onClose, menus }: Props) {
  const { data, save } = useMenuFavoriteFolders();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const folderOf = new Map(data.assignments.map((a) => [a.menuCode, a.folderId]));
  const errorMessage = save.error instanceof Error ? save.error.message : "";

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await save.mutateAsync(renaming ? { type: "rename", id: renaming, name: trimmed } : { type: "create", name: trimmed });
    setName("");
    setRenaming(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="즐겨찾기 폴더 관리" size="md">
      <div className="space-y-5">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder={renaming ? "새 폴더 이름" : "폴더 이름 (예: 매일 보는 화면)"}
            aria-label="폴더 이름"
            className="flex-1 px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-sm text-text dark:text-white"
          />
          <Button type="submit" variant="primary" disabled={!name.trim() || save.isPending}>
            {renaming ? "이름 저장" : "폴더 만들기"}
          </Button>
          {renaming && (
            <Button type="button" variant="outline" onClick={() => { setRenaming(null); setName(""); }}>
              취소
            </Button>
          )}
        </form>
        {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}

        <section>
          <h3 className="text-sm font-semibold text-text dark:text-white mb-2">폴더 ({data.folders.length})</h3>
          {data.folders.length === 0 ? (
            <p className="text-xs text-text-secondary">폴더가 없습니다. 위에서 만들 수 있습니다.</p>
          ) : (
            <ul className="space-y-1">
              {data.folders.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-surface dark:bg-background-dark">
                  <Icon name="folder" size="xs" className="text-text-secondary" />
                  <span className="flex-1 truncate text-sm text-text dark:text-white">{f.name}</span>
                  {confirmDelete === f.id ? (
                    <>
                      <span className="text-xs text-error">삭제할까요?</span>
                      <button type="button" className="text-xs font-semibold text-error hover:underline"
                        onClick={async () => { await save.mutateAsync({ type: "delete", id: f.id }); setConfirmDelete(null); }}>
                        삭제
                      </button>
                      <button type="button" className="text-xs text-text-secondary hover:underline" onClick={() => setConfirmDelete(null)}>취소</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setRenaming(f.id); setName(f.name); }}>이름 바꾸기</button>
                      <button type="button" className="text-xs text-error hover:underline" onClick={() => setConfirmDelete(f.id)}>삭제</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-text dark:text-white mb-2">즐겨찾기 메뉴 ({menus.length})</h3>
          {menus.length === 0 ? (
            <p className="text-xs text-text-secondary">즐겨찾기한 메뉴가 없습니다. 좌측 메뉴 옆의 ★ 를 누르세요.</p>
          ) : (
            <ul className="space-y-1 max-h-[40vh] overflow-y-auto">
              {menus.map((m) => (
                <li key={m.code} className="flex items-center gap-2 px-2 py-1">
                  <Icon name={m.icon} size="xs" className="text-text-secondary" />
                  <span className="flex-1 truncate text-sm text-text dark:text-white">{m.label}</span>
                  <select
                    value={folderOf.get(m.code) ?? ""}
                    aria-label={`${m.label} 폴더`}
                    onChange={(e) => save.mutate({ type: "move", menuCode: m.code, folderId: e.target.value || null })}
                    className="text-xs px-2 py-1 rounded-md border border-border dark:border-border-dark bg-background-white dark:bg-background-dark text-text dark:text-white"
                  >
                    <option value="">기본 즐겨찾기</option>
                    {data.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
