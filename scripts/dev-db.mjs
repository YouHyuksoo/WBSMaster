/**
 * @file scripts/dev-db.mjs
 * @description
 * 로컬 개발 서버를 운영 DB 에 연결할 때 쓰는 함수 모음입니다 (실행은 scripts/dev.mjs).
 *
 * 초보자 가이드:
 * - devDatabase: .env.local 의 DEV_DATABASE_URL 을 읽는다. 없으면 null (DATABASE_URL 의 로컬 DB 를 쓴다)
 * - pendingMigrations: 로컬에는 있는데 운영 DB 에 아직 적용되지 않은 마이그레이션
 * - 저장소가 공개이므로 서버 주소 · 비밀번호는 이 파일에 적지 않는다
 */

/** 접속 주소와, 화면에 보여도 되는 이름(비밀번호 없음) */
export function devDatabase(env) {
  const url = env.DEV_DATABASE_URL?.trim();
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DEV_DATABASE_URL 형식이 올바르지 않습니다."); // URL 오류 메시지에 비밀번호가 섞이지 않게 원문을 버린다
  }
  return { url, label: `${parsed.username}@${parsed.host}${parsed.pathname}` };
}

export function pendingMigrations(local, applied) {
  const done = new Set(applied);
  return local.filter((name) => !done.has(name));
}

/** 운영 DB 에 붙은 next 에 넘길 환경 변수 (프로세스 환경 변수는 .env.local 보다 우선한다) */
export function devServerEnv(base, url) {
  return { ...base, DATABASE_URL: url, KNOWLEDGE_SYNC: "off", UPLOADS_READ_ONLY: "1" };
}
