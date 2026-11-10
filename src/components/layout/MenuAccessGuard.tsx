/**
 * @file src/components/layout/MenuAccessGuard.tsx
 * @description
 * 주소로 직접 들어와도 내 역할에 허용되지 않은 화면은 본문 대신 "권한 없음" 안내를 보여 줍니다 (HANES AuthGuard 와 같음).
 *
 * 초보자 가이드:
 * 1. 주소 → 메뉴 코드는 menu-config.ts 의 menuForPath 로 찾는다. 등록부에 없는 주소(도움말 등)는 검사하지 않는다
 * 2. 권한을 아직 받는 중이면 막지 않는다 (깜빡임 방지). 데이터 API 의 로그인 · 프로젝트 권한 검사는 그대로다
 * 3. 자동 이동하지 않고 "대시보드로" 버튼을 둔다
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { useCurrentUser, useMyMenuAccess } from "@/hooks";
import { menuForPath } from "@/lib/menu/menu-config";
import { canAccessMenu } from "@/lib/menu/menu-tree";

export function MenuAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { data: access, isLoading } = useMyMenuAccess();
  const menu = menuForPath(pathname);

  if (!menu || !user || isLoading) return <>{children}</>;
  if (canAccessMenu(menu.code, access ? access.allowedMenus : undefined, user.role === "ADMIN")) return <>{children}</>;

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <Icon name="gpp_bad" size="xl" className="text-error" />
      <div>
        <h1 className="text-lg font-bold text-text dark:text-white">이 화면을 볼 권한이 없습니다</h1>
        <p className="mt-1 text-sm text-text-secondary">
          「{menu.label}」 메뉴는 내 역할에 열려 있지 않습니다. 필요하면 관리자에게 권한 관리에서 열어 달라고 요청하세요.
        </p>
      </div>
      <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        대시보드로
      </Link>
    </div>
  );
}
