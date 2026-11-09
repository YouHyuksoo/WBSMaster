/**
 * @file src/lib/llm/generate-sql.test.ts
 * @description
 * generateSQL 이 LLM 에 읽기 전용 규칙을 항상 앞세워 보내고, 쓰기(INSERT) 예시를 보내지 않는지 확인합니다.
 *
 * 초보자 가이드:
 * - DB 에 저장된 사용자 지정 sqlSystemPrompt 에 예전 INSERT 지시가 남아 있어도 READ_ONLY_SQL_RULES 가 먼저 온다.
 */

import { describe, expect, it } from "vitest";
import { generateSQL, READ_ONLY_SQL_RULES } from "./index";
import { LLMClient } from "./client-base";

class Capture extends LLMClient {
  prompt = "";
  system = "";
  constructor() {
    super({ provider: "openai", apiKey: "", model: "m" });
  }
  async generate(prompt: string, systemPrompt?: string) {
    this.prompt = prompt;
    this.system = systemPrompt ?? "";
    return "SELECT 1";
  }
}

describe("generateSQL", () => {
  it("prefixes read-only rules even with custom prompt", async () => {
    const c = new Capture();
    await generateSQL(c, "이슈 보여줘", "p1", "u1", "옛날 프롬프트: INSERT 하세요", ["issues"]);
    expect(c.system.startsWith(READ_ONLY_SQL_RULES)).toBe(true);
    expect(c.system).toContain("옛날 프롬프트");
  });

  it("prompt has no INSERT example", async () => {
    const c = new Capture();
    await generateSQL(c, "이슈 보여줘", "p1", "u1", undefined, ["issues"]);
    expect(c.prompt).not.toMatch(/INSERT INTO/i);
    expect(c.prompt).toContain("p1");
  });
});
