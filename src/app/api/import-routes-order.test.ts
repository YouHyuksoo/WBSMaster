/**
 * @file src/app/api/import-routes-order.test.ts
 * @description
 * 엑셀 가져오기 라우트가 "기존 데이터 삭제"를 파일 검사보다 먼저 하지 않는지 소스를 읽어 확인합니다.
 *
 * 초보자 가이드:
 * - 회귀: 고객요구사항 · 현업이슈 · 진도 태스크 · 기능추적표 가져오기가 clearExisting 일 때
 *   엑셀을 읽기 전에 deleteMany 를 먼저 실행해서, 파일이 잘못돼 가져오기가 실패해도 기존 데이터가 사라졌다.
 * - 규칙: 각 import 라우트에서 첫 deleteMany( 는 XLSX.read( 뒤, 그리고 그 뒤의 { status: 400 } 검사 뒤에 나와야 한다.
 * - 새 import 라우트를 추가하면 이 테스트가 자동으로 함께 검사한다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = join(process.cwd(), "src", "app", "api");

/** src/app/api 아래 경로에 import 가 들어간 route.ts 목록 */
function findImportRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findImportRoutes(full));
    else if (name === "route.ts" && /[\\/]import[\\/]/.test(full)) out.push(full);
  }
  return out;
}

const routes = findImportRoutes(API_DIR).filter((f) => readFileSync(f, "utf8").includes("deleteMany("));

describe("엑셀 가져오기 라우트: 검사 후 삭제", () => {
  it("검사 대상 라우트가 있다", () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(routes.map((f) => [relative(process.cwd(), f), f]))("%s", (_name, file) => {
    const src = readFileSync(file, "utf8");
    const read = src.indexOf("XLSX.read(");
    const del = src.indexOf("deleteMany(");
    expect(read, "XLSX.read( 가 없음").toBeGreaterThanOrEqual(0);
    expect(del, "deleteMany( 가 XLSX.read( 보다 먼저 나옴").toBeGreaterThan(read);
    const validation = src.slice(read, del).search(/status:\s*400/);
    expect(validation, "XLSX.read( 와 deleteMany( 사이에 400 검사(파일 형식/데이터 확인)가 없음").toBeGreaterThanOrEqual(0);
  });
});
