/**
 * @file src/lib/session.ts
 * @description
 * 클라이언트 세션 만료 처리 공용 함수입니다.
 * 서버 인증은 쿠키 `userId`, 화면의 로그인 표시는 localStorage `user` 라서
 * 쿠키만 없어지면(만료 7일, 다른 탭 로그아웃) 화면은 로그인 상태인데 API 는 401 이 됩니다.
 *
 * 초보자 가이드:
 * - handleUnauthorized(): localStorage `user` 를 지우고 로그인 화면으로 보냅니다 (중복 호출 무시).
 * - checkSession(): /api/auth/me 로 세션을 확인하고 401 이면 handleUnauthorized() 를 부릅니다.
 */

let redirecting = false;

/** 테스트용: 중복 방지 플래그 초기화 */
export function resetSessionRedirectForTest() {
  redirecting = false;
}

/** 세션이 없을 때: 저장된 사용자 정보를 지우고 로그인 화면으로 이동 */
export function handleUnauthorized(): void {
  if (typeof window === "undefined" || redirecting) return;
  if (window.location.pathname.startsWith("/login")) return;
  redirecting = true;
  try {
    localStorage.removeItem("user");
  } catch {
    // 저장소 접근이 막힌 환경은 무시
  }
  window.location.assign("/login");
}

/** /api/auth/me 로 세션 확인. 401 이면 로그인 화면으로 보낸다. 네트워크 오류는 무시. */
export async function checkSession(): Promise<void> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    if (res.status === 401) handleUnauthorized();
  } catch {
    // 오프라인 등은 다음 확인 때 다시 본다
  }
}
