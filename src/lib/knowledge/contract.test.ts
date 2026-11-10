/**
 * @file src/lib/knowledge/contract.test.ts
 * @description 색인 대상과 실제 스키마·트리거·채팅 등록 계약을 대조합니다.
 * 초보자 가이드: 파일 계약 검사이며 DB나 외부 API에는 접속하지 않습니다.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import targets from "./targets.json";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261110000000_knowledge_outbox/migration.sql", "utf8");
describe("지식 수집 계약", () => {
  it("모든 대상은 실제 스칼라 필드와 프로젝트 경로를 가진다", () => {
    const modelNames = new Set([...schema.matchAll(/^model (\w+)/gm)].map((m) => m[1]));
    for (const target of targets) {
      const body = schema.match(new RegExp(`model ${target.model} \\{([\\s\\S]*?)\\n\\}`))![1];
      const types = new Map([...body.matchAll(/^\s{2}(\w+)\s+(\w+)/gm)].map((m) => [m[1], m[2]]));
      for (const field of target.fields) {
        expect(types.has(field), `${target.model}.${field}`).toBe(true);
        expect(modelNames.has(types.get(field)!), `${target.model}.${field} must be scalar`).toBe(false);
        expect(field).not.toMatch(/password|token|secret|apiKey/i);
      }
      expect(body).toContain(`@@map("${target.table}")`);
      if (!["projects", "users"].includes(target.table)) expect(target.fields.includes("projectId") || "parent" in target).toBe(true);
      if ("parent" in target && target.parent) {
        const parent = targets.find((t) => t.table === target.parent!.table)!;
        expect(parent.fields).toContain("projectId");
        expect(target.fields).toContain(target.parent.field);
      }
    }
  });
  it("수집 SQL의 whitelist는 런타임 계약과 같고 성공한 쓰기와 삭제 시점을 구분한다", () => {
    const saved = JSON.parse(migration.match(/\$json\$([\s\S]*?)\$json\$/)![1]);
    expect(Object.values(saved)).toEqual(targets);
    for (const target of targets) {
      expect(migration).toContain(`AFTER INSERT OR UPDATE ON public."${target.table}"`);
      expect(migration).toContain(`BEFORE DELETE ON public."${target.table}"`);
    }
  });
  it("채팅 기본 레지스트리에 지식 검색이 실제 등록돼 있다", () => {
    const code = readFileSync("src/lib/chat-tools/index.ts", "utf8");
    expect(code).toMatch(/import \{[^}]*\bsearchKnowledgeTool\b[^}]*\} from "\.\/knowledge"/);
    expect(code).toMatch(/const ALL = \[[\s\S]*?searchKnowledgeTool/);
    expect(code).toMatch(/const ALL = \[[\s\S]*?listKnowledgeDocumentsTool/);
  });
});
