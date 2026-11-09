/**
 * @file src/lib/chat-tools/readonly-sql.test.ts
 * @description
 * 자유 SQL 채팅 도구(run_readonly_sql) 테스트입니다. LLM SQL 생성과 실행은 목입니다.
 *
 * 초보자 가이드:
 * - 결과에 다른 프로젝트 행(projectId 가 다름)이 섞이면 결과를 버리고 오류를 돌려준다.
 * - 읽기 문이 아니면 실행하지 않는다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const gen = vi.hoisted(() => ({ sql: "SELECT 1" as string | null, lastPrompt: undefined as string | undefined }));
const exec = vi.hoisted(() => ({ rows: [] as unknown[], called: 0 }));

vi.mock("@/lib/llm/index", () => ({
  selectRelevantTables: vi.fn(async () => ["issues"]),
  generateSQL: vi.fn(async (_c: unknown, _q: string, _p: string, _u: string, prompt?: string) => {
    gen.lastPrompt = prompt;
    return gen.sql;
  }),
  validateSQL: (sql: string) => (/^\s*(select|with)\b/i.test(sql) ? { valid: true } : { valid: false, error: "SELECT 문만 허용됩니다." }),
}));
vi.mock("@/lib/llm/safe-sql", () => ({
  runSafeSql: vi.fn(async () => {
    exec.called++;
    return exec.rows;
  }),
}));

import { runReadonlySqlTool } from "./readonly-sql";
import type { ToolContext } from "./types";

const ctx = {
  projectId: "p1",
  user: { id: "u1", email: "u@x", role: "USER" },
  prisma: {},
  llm: {},
  promptConfig: { sqlSystemPrompt: "사용자 SQL 프롬프트" },
} as unknown as ToolContext;

beforeEach(() => {
  gen.sql = "SELECT 1";
  exec.rows = [];
  exec.called = 0;
});

describe("run_readonly_sql", () => {
  it("rejects foreign project rows", async () => {
    exec.rows = [{ projectId: "p1", title: "a" }, { projectId: "p2", title: "b" }];
    const r = await runReadonlySqlTool.execute(ctx, runReadonlySqlTool.parse({ question: "이슈 수" }));
    expect(r.kind).toBe("error");
    expect(JSON.stringify(r)).not.toContain('"b"');
  });

  it("returns validation error for non-select", async () => {
    gen.sql = `UPDATE "issues" SET "title"='x'`;
    const r = await runReadonlySqlTool.execute(ctx, runReadonlySqlTool.parse({ question: "바꿔줘" }));
    expect(r.kind).toBe("error");
    expect(exec.called).toBe(0);
  });

  it("passes sqlSystemPrompt to generateSQL", async () => {
    exec.rows = [{ n: 3 }];
    const r = await runReadonlySqlTool.execute(ctx, runReadonlySqlTool.parse({ question: "이슈 수" }));
    expect(gen.lastPrompt).toBe("사용자 SQL 프롬프트");
    expect(r.kind).toBe("data");
    if (r.kind === "data") expect(r.rows).toEqual([{ n: 3 }]);
  });

  it("NO_SQL → error asking another tool", async () => {
    gen.sql = null;
    const r = await runReadonlySqlTool.execute(ctx, runReadonlySqlTool.parse({ question: "안녕" }));
    expect(r.kind).toBe("error");
  });
});
