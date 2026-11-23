/**
 * @file src/lib/login-throttle.ts
 * @description
 * 로그인 실패 횟수를 세어 비밀번호를 계속 넣어 보는 시도를 늦추는 도우미입니다.
 *
 * 초보자 가이드:
 * - 15분 동안 같은 주소(IP)에서 같은 이메일로 5번, 같은 이메일로 20번, 같은 주소에서 50번 틀리면 그 15분이 지날 때까지 막는다.
 * - 횟수는 서버 메모리에만 있다 (PM2 프로세스 하나 기준). 서버를 다시 시작하면 지워진다.
 * - 주소는 X-Forwarded-For 의 마지막 값(바로 앞 프록시 IIS 가 붙인 값)을 쓴다. 맨 앞 값은 요청자가 마음대로 적을 수 있다.
 *   프록시 없이 직접 붙으면 주소를 믿을 수 없으므로 이메일 기준 제한(20번)이 최종 방어선이다.
 * - 로그인에 성공하면 그 주소 · 이메일의 실패 횟수만 지운다.
 */

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { account: 5, email: 20, ip: 50 } as const;
const MAX_KEYS = 20_000;

/** 키 → 실패 시각(ms) 목록 */
const failures = new Map<string, number[]>();

function keys(ip: string, email: string): { key: string; limit: number }[] {
  const mail = email.trim().toLowerCase();
  return [
    { key: `a:${ip}|${mail}`, limit: LIMITS.account },
    { key: `e:${mail}`, limit: LIMITS.email },
    { key: `i:${ip}`, limit: LIMITS.ip },
  ];
}

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

/** 요청을 보낸 주소 (프록시가 붙인 X-Forwarded-For 의 마지막 값, 없으면 "unknown") */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded?.[forwarded.length - 1] || "unknown";
}

/** 막혀 있으면 다시 시도할 수 있을 때까지 남은 초, 아니면 0 */
export function loginBlockedSeconds(ip: string, email: string, now: number = Date.now()): number {
  let wait = 0;
  for (const { key, limit } of keys(ip, email)) {
    const list = recent(key, now);
    if (list.length >= limit) wait = Math.max(wait, Math.ceil((list[list.length - limit] + WINDOW_MS - now) / 1000));
  }
  return wait;
}

/** 로그인 실패 1회 기록 */
export function recordLoginFailure(ip: string, email: string, now: number = Date.now()): void {
  if (failures.size > MAX_KEYS) {
    for (const key of [...failures.keys()]) recent(key, now);
  }
  for (const { key } of keys(ip, email)) failures.set(key, [...recent(key, now), now]);
}

/** 로그인 성공: 그 주소 · 이메일의 실패 횟수를 지운다 (이메일 전체 · 주소 전체 횟수는 시간이 지나야 풀린다) */
export function clearLoginFailures(ip: string, email: string): void {
  failures.delete(keys(ip, email)[0].key);
}

/** 테스트용: 모든 횟수 초기화 */
export function resetLoginThrottleForTest(): void {
  failures.clear();
}
