/**
 * @file src/constants/business-units.test.ts
 * @description
 * 다중 사업부를 관리하지 않는다는 규칙(2026-11-09)이 다시 깨지지 않게 소스를 읽어 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 사업부 기본값을 라우트마다 따로 넣어(`businessUnit || DEFAULT`, 요청 값 그대로 저장 등) 값이 어긋났다.
 * - 규칙 1: prisma/schema.prisma 의 모든 businessUnit 칼럼은 @default(DEFAULT_BUSINESS_UNIT) 를 가진다.
 * - 규칙 2: src/app/api 와 src/lib/api.ts 는 요청에서 사업부를 읽거나(body.businessUnit, ?businessUnit=)
 *   임의 값을 쓰지 않는다. 허용: 고유키 조회용 DEFAULT_BUSINESS_UNIT, 정렬("asc"/"desc"), 주석.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_UNIT } from "./business-units";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe("사업부: DB 기본값 하나", () => {
  it("schema.prisma 의 모든 businessUnit 칼럼이 같은 기본값을 가진다", () => {
    const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
    const columns = schema.split(/\r?\n/).filter((line) => /^\s*businessUnit\s+String/.test(line));
    expect(columns.length).toBeGreaterThan(0);
    for (const line of columns) {
      expect(line, line.trim()).toContain(`@default("${DEFAULT_BUSINESS_UNIT}")`);
    }
  });

  it("API 코드는 요청에서 사업부를 읽거나 임의 값을 쓰지 않는다", () => {
    const files = [...walk(join(ROOT, "src", "app", "api")), join(ROOT, "src", "lib", "api.ts")];
    const forbidden: RegExp[] = [
      /body\.businessUnit/,
      /\.get\(\s*["']businessUnit["']\s*\)/,
      /businessUnit\s*(\|\||\?\?)/,
      /(?<![\w$])businessUnit\??:\s*(?!DEFAULT_BUSINESS_UNIT\b|"asc"|"desc")\S/, // 고유키 이름(projectId_businessUnit) 제외
    ];
    const hits: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          const code = line.trim();
          if (code.startsWith("*") || code.startsWith("//") || code.startsWith("/*")) return;
          if (forbidden.some((re) => re.test(code))) hits.push(`${relative(ROOT, file)}:${i + 1}: ${code}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
