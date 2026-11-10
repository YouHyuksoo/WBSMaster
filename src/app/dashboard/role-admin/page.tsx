/**
 * @file src/app/dashboard/role-admin/page.tsx
 * @description
 * 권한 관리 (HANES 역할 관리 방식): 역할마다 쓸 수 있는 메뉴를 체크해 저장한다. ADMIN 전용.
 *
 * 초보자 가이드:
 * 1. 역할은 ADMIN · USER · GUEST 셋으로 고정이다 (사용자 역할은 사용자/프로젝트 관리에서 정한다)
 * 2. ADMIN 은 모든 메뉴를 쓰므로 고칠 수 없다. ADMIN 전용 메뉴는 다른 역할에 줄 수 없다
 * 3. 저장은 바뀐 것이 있을 때만 켜진다. 되돌리기는 저장된 값으로 되돌린다
 * 4. 허용되지 않은 메뉴는 좌측 메뉴에서 흐리게 보이고, 주소로 들어와도 권한 없음 안내가 나온다
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { useMenuTree, useRoleMenuPermissions, useSaveRolePermissions } from "@/hooks";
import { MENU_REGISTRY } from "@/lib/menu/menu-config";
import { PermissionTree, buildPermissionGroups } from "./components";

const ROLES = [
  { code: "ADMIN", label: "관리자 (ADMIN)", note: "모든 메뉴 사용 · 고칠 수 없음" },
  { code: "USER", label: "사용자 (USER)", note: "일반 업무 사용자" },
  { code: "GUEST", label: "손님 (GUEST)", note: "조회 위주 외부 사용자" },
] as const;

export default function RoleAdminPage() {
  const [role, setRole] = useState<string>("USER");
  const { data: tree = [] } = useMenuTree();
  const { data: saved, isLoading } = useRoleMenuPermissions(role);
  const saveMutation = useSaveRolePermissions();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const groups = useMemo(() => buildPermissionGroups(tree, MENU_REGISTRY), [tree]);
  const savedSet = useMemo(() => new Set(saved ?? []), [saved]);
  const isAdminRole = role === "ADMIN";
  const dirty = !isAdminRole && (checked.size !== savedSet.size || [...checked].some((c) => !savedSet.has(c)));

  // 역할을 바꾸거나 서버 값이 오면 체크 상태를 저장된 값으로 맞춘다
  useEffect(() => {
    setChecked(new Set(saved ?? []));
    setMessage("");
  }, [saved, role]);

  const grantableCodes = MENU_REGISTRY.filter((m) => !m.systemOnly).map((m) => m.code);
  const save = async () => {
    setMessage("");
    await saveMutation.mutateAsync({ role, menuCodes: [...checked] });
    setMessage("저장했습니다.");
    setTimeout(() => setMessage(""), 3000);
  };
  const errorMessage = saveMutation.error instanceof Error ? saveMutation.error.message : "";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text dark:text-white flex items-center gap-2">
          <Icon name="admin_panel_settings" className="text-primary" />
          권한 관리
        </h1>
        <p className="text-sm text-text-secondary mt-1">역할마다 쓸 수 있는 메뉴를 정합니다. 허용하지 않은 메뉴는 좌측 메뉴에서 흐리게 보이고 들어갈 수 없습니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <ul className="lg:col-span-4 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-2 space-y-1" aria-label="역할 목록">
          {ROLES.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => setRole(r.code)}
                aria-pressed={role === r.code}
                className={`w-full rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  role === r.code ? "bg-primary/10 text-primary" : "text-text dark:text-white hover:bg-surface dark:hover:bg-surface-hover"
                }`}
              >
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-xs text-text-secondary">{r.note}</p>
              </button>
            </li>
          ))}
        </ul>

        <section className="lg:col-span-8 rounded-xl border border-border dark:border-border-dark bg-background-white dark:bg-surface-dark p-4 space-y-3">
          {isAdminRole ? (
            <p className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-text dark:text-white">
              <Icon name="info" size="sm" className="text-info" />
              ADMIN 은 모든 메뉴를 쓸 수 있어 권한을 저장하지 않습니다.
            </p>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              <button type="button" className="text-primary hover:underline" onClick={() => setChecked(new Set(grantableCodes))}>모두 선택</button>
              <button type="button" className="text-primary hover:underline" onClick={() => setChecked(new Set())}>모두 해제</button>
              <span className="text-text-secondary tabular-nums">{checked.size} / {grantableCodes.length}개 허용</span>
            </div>
          )}

          {isLoading && !isAdminRole ? (
            <p className="text-sm text-text-secondary">불러오는 중...</p>
          ) : (
            <PermissionTree groups={groups} checked={checked} readOnly={isAdminRole} onChange={setChecked} />
          )}

          {!isAdminRole && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border dark:border-border-dark pt-3">
              {message && <span className="text-sm text-success">{message}</span>}
              {errorMessage && <span className="text-sm text-error">{errorMessage}</span>}
              <Button type="button" variant="outline" onClick={() => setChecked(new Set(saved ?? []))} disabled={!dirty || saveMutation.isPending}>되돌리기</Button>
              <Button type="button" variant="primary" onClick={save} disabled={!dirty || saveMutation.isPending}>
                {saveMutation.isPending ? "저장 중..." : "권한 저장"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
