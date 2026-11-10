/**
 * @file src/hooks/useMenu.ts
 * @description
 * 메뉴 관리 React Query 훅: 그룹 · 배치 트리, 내 권한, 역할 권한, 즐겨찾기 · 폴더.
 *
 * 초보자 가이드:
 * 1. useMenuTree / useMyMenuAccess: 좌측 메뉴 · 화면 접근 차단이 쓴다 (5분 캐시)
 * 2. 메뉴 관리 · 권한 관리 화면의 변경 후에는 menuKeys.all 을 무효화해 좌측 메뉴가 바로 바뀐다
 * 3. useMenuFavorites().toggle(code): 화면 먼저 바꾸고 서버에 전체 목록을 보낸다. 실패하면 다시 불러온다
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui";
import { api } from "@/lib/api";

/** 즐겨찾기 최대 개수 (서버 FAVORITE_LIMIT 과 같다) */
export const FAVORITE_LIMIT = 30;

export const menuKeys = {
  all: ["menu"] as const,
  tree: () => [...menuKeys.all, "tree"] as const,
  unassigned: () => [...menuKeys.all, "unassigned"] as const,
  me: () => [...menuKeys.all, "me"] as const,
  permissions: (role: string) => [...menuKeys.all, "permissions", role] as const,
  favorites: () => [...menuKeys.all, "favorites"] as const,
  folders: () => [...menuKeys.all, "folders"] as const,
};

const FIVE_MIN = 5 * 60 * 1000;

export function useMenuTree() {
  return useQuery({ queryKey: menuKeys.tree(), queryFn: api.menu.tree, staleTime: FIVE_MIN });
}

export function useUnassignedMenus(enabled = true) {
  return useQuery({ queryKey: menuKeys.unassigned(), queryFn: api.menu.unassigned, enabled });
}

export function useMyMenuAccess() {
  return useQuery({ queryKey: menuKeys.me(), queryFn: api.menu.me, staleTime: FIVE_MIN });
}

export function useRoleMenuPermissions(role: string | null) {
  return useQuery({ queryKey: menuKeys.permissions(role ?? ""), queryFn: () => api.menu.permissions(role!), enabled: !!role && role !== "ADMIN" });
}

/** 메뉴 관리 · 권한 관리 변경 후 메뉴 관련 캐시를 모두 다시 불러온다 */
export function useInvalidateMenus() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: menuKeys.all }), [queryClient]);
}

export function useSaveRolePermissions() {
  const invalidate = useInvalidateMenus();
  return useMutation({
    mutationFn: ({ role, menuCodes }: { role: string; menuCodes: string[] }) => api.menu.savePermissions(role, menuCodes),
    onSuccess: () => invalidate(),
  });
}

/** 즐겨찾기 목록 + 토글 (최대 30개) */
export function useMenuFavorites() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: menuKeys.favorites(), queryFn: api.menu.favorites, staleTime: FIVE_MIN });
  const save = useMutation({
    mutationFn: (codes: string[]) => api.menu.saveFavorites(codes),
    onMutate: (codes) => queryClient.setQueryData(menuKeys.favorites(), codes),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "즐겨찾기를 저장하지 못했습니다.");
      queryClient.invalidateQueries({ queryKey: menuKeys.favorites() });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: menuKeys.folders() }),
  });
  const favorites = query.data ?? [];
  const toggle = useCallback(
    (code: string) => {
      if (query.isLoading || save.isPending) return;
      const adding = !favorites.includes(code);
      if (adding && favorites.length >= FAVORITE_LIMIT) {
        toast.error(`즐겨찾기는 최대 ${FAVORITE_LIMIT}개까지 담을 수 있습니다. 쓰지 않는 즐겨찾기를 먼저 빼세요.`);
        return;
      }
      save.mutate(adding ? [...favorites, code] : favorites.filter((c) => c !== code));
    },
    [favorites, query.isLoading, save, toast]
  );
  return { favorites, isLoading: query.isLoading, isSaving: save.isPending, error: save.error, toggle };
}

export type FolderAction =
  | { type: "create"; name: string }
  | { type: "rename"; id: string; name: string }
  | { type: "delete"; id: string }
  | { type: "move"; menuCode: string; folderId: string | null };

/** 즐겨찾기 폴더 조회 + 만들기 · 이름 바꾸기 · 지우기 · 메뉴 옮기기 */
export function useMenuFavoriteFolders() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: menuKeys.folders(), queryFn: api.menu.folders, staleTime: FIVE_MIN });
  const save = useMutation({
    mutationFn: async (action: FolderAction) => {
      if (action.type === "create") await api.menu.createFolder(action.name);
      else if (action.type === "rename") await api.menu.renameFolder(action.id, action.name);
      else if (action.type === "delete") await api.menu.deleteFolder(action.id);
      else await api.menu.moveFavorite(action.menuCode, action.folderId);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: menuKeys.folders() }),
  });
  return { data: query.data ?? { folders: [], assignments: [] }, isLoading: query.isLoading, save };
}
