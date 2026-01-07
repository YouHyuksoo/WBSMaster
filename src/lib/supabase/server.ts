/**
 * @file src/lib/supabase/server.ts
 * @description
 * 서버 컴포넌트 및 API Routes에서 사용할 Supabase 클라이언트입니다.
 * 쿠키를 통해 세션을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **서버 컴포넌트**: async 컴포넌트에서 사용
 * 2. **API Routes**: route.ts 파일에서 사용
 * 3. **쿠키 관리**: 세션 정보를 쿠키에 저장/읽기
 *
 * @example
 * // 서버 컴포넌트에서 사용
 * import { createClient } from '@/lib/supabase/server';
 *
 * export default async function Page() {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   return <div>Hello, {user?.email}</div>;
 * }
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 사이드 Supabase 클라이언트 생성
 * @returns Supabase 클라이언트 인스턴스
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 호출 시 무시
            // 미들웨어에서 세션 갱신 시 사용됨
          }
        },
      },
    }
  );
}
