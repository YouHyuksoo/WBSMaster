/**
 * @file src/lib/supabase/client.ts
 * @description
 * 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트입니다.
 * 브라우저에서 실행되며, 'use client' 컴포넌트에서 사용합니다.
 *
 * 초보자 가이드:
 * 1. **클라이언트 컴포넌트**: 'use client' 선언된 컴포넌트에서 사용
 * 2. **실시간 기능**: Supabase Realtime 구독 시 사용
 * 3. **인증 상태**: 로그인/로그아웃 처리
 *
 * @example
 * 'use client';
 *
 * import { createClient } from '@/lib/supabase/client';
 *
 * export function LoginButton() {
 *   const supabase = createClient();
 *
 *   const handleLogin = async () => {
 *     await supabase.auth.signInWithOAuth({ provider: 'google' });
 *   };
 *
 *   return <button onClick={handleLogin}>로그인</button>;
 * }
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * 클라이언트 사이드 Supabase 클라이언트 생성
 * @returns Supabase 클라이언트 인스턴스
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
