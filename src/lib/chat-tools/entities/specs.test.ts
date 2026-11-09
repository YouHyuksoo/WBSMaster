/**
 * @file src/lib/chat-tools/entities/specs.test.ts
 * @description
 * 공통 등록·수정·삭제 메뉴 정의가 실제 Prisma 스키마와 맞는지 검사합니다 (모델·대상 칼럼·필드 이름 오타 방지).
 *
 * 초보자 가이드:
 * - 사람 필드(person/people)는 to 칼럼이, 서버가 바꾸는 특수 필드(parentCode)는 예외 목록이 스키마에 있어야 한다.
 * - 라우트 import 가 실제 파일을 가리키는지도 확인한다 (경로 오타 방지).
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { ENTITY_SPECS } from "./index";

const schema = fs.readFileSync(path.resolve(__dirname, "../../../../prisma/schema.prisma"), "utf8");
const modelFields = (model: string): Set<string> => {
  const name = model[0].toUpperCase() + model.slice(1);
  const m = schema.match(new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, "m"));
  if (!m) return new Set();
  return new Set(m[1].split("\n").map((l) => l.trim().split(/\s+/)[0]).filter((w) => /^[a-z]\w*$/.test(w)));
};
/** 화면 API 가 받지만 모델 칼럼이 아닌 필드 (서버가 다른 칼럼으로 바꿈) */
const NON_COLUMN = new Set(["parentCode", "contents"]);

describe.each(ENTITY_SPECS.map((s) => [s.key, s] as const))("%s", (_k, spec) => {
  it("model exists and ref/field names are real columns", () => {
    const cols = modelFields(spec.model);
    expect(cols.size, `${spec.model} 모델 없음`).toBeGreaterThan(0);
    for (const r of spec.refFields) expect(cols.has(r), `${spec.model}.${r}`).toBe(true);
    for (const f of spec.fields) {
      const col = f.type === "person" || f.type === "people" ? f.to! : f.key;
      if (NON_COLUMN.has(col)) continue;
      if (f.type === "people") continue; // 다대다 (assigneeIds → assignees 관계)
      expect(cols.has(col), `${spec.model}.${col}`).toBe(true);
    }
  });

  it("route paths point to real files", () => {
    const api = path.resolve(__dirname, "../../../app");
    if (spec.ops.create) expect(fs.existsSync(path.join(api, spec.collectionPath!, "route.ts")), spec.collectionPath).toBe(true);
    if (spec.ops.update || spec.ops.delete) expect(fs.existsSync(path.join(api, spec.itemPath!("[id]"), "route.ts")), spec.itemPath!("[id]")).toBe(true);
  });
});
