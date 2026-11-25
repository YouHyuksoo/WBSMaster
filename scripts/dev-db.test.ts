/**
 * @file scripts/dev-db.test.ts
 * @description 로컬 개발 서버의 운영 DB 연결 설정(설정 읽기 · 마이그레이션 비교 · 넘길 환경 변수)을 검사합니다.
 * 초보자 가이드: 실제 DB 에는 접속하지 않는다. 접속 확인은 node scripts/dev.mjs --check
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { devDatabase, devServerEnv, pendingMigrations } from "./dev-db.mjs";

describe("개발 서버 운영 DB 연결", () => {
  it("설정이 없으면 로컬 DB", () => {
    expect(devDatabase({})).toBeNull();
    expect(devDatabase({ DEV_DATABASE_URL: "  " })).toBeNull();
  });
  it("화면에 보일 이름에 비밀번호가 없다", () => {
    const db = devDatabase({ DEV_DATABASE_URL: "postgresql://app:p%40ss@db.example:5432/wbs?schema=public" })!;
    expect(db.url).toContain("p%40ss");
    expect(db.label).toBe("app@db.example:5432/wbs");
  });
  it("형식이 틀린 주소의 오류 메시지에 원문(비밀번호)이 없다", () => {
    expect(() => devDatabase({ DEV_DATABASE_URL: "secret pass" })).toThrow(/^DEV_DATABASE_URL 형식이 올바르지 않습니다\.$/);
  });
  it("운영에 없는 마이그레이션을 찾는다", () => expect(pendingMigrations(["a", "b"], ["a"])).toEqual(["b"]));
  it("지식 전송과 파일 저장을 끄고 DATABASE_URL 만 바꾼다 (DIRECT_URL 은 로컬 그대로)", () => {
    expect(devServerEnv({ DIRECT_URL: "local", KNOWLEDGE_SYNC: "on" }, "prod")).toEqual({ DIRECT_URL: "local", DATABASE_URL: "prod", KNOWLEDGE_SYNC: "off", UPLOADS_READ_ONLY: "1" });
  });
  it("공개 저장소에 서버 주소를 적지 않는다", () => {
    for (const f of ["dev.mjs", "dev-db.mjs"]) expect(readFileSync(join(process.cwd(), "scripts", f), "utf8")).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});
