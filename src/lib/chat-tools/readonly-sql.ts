/**
 * @file src/lib/chat-tools/readonly-sql.ts
 * @description
 * 다른 도구로 답할 수 없는 질문에만 쓰는 자유 SQL 채팅 도구(run_readonly_sql)입니다.
 *
 * 초보자 가이드:
 * - 질문을 받아 기존 파이프라인(테이블 선택 → SQL 생성)으로 SQL 을 만들고, runSafeSql(READ ONLY 트랜잭션)로 실행한다.
 * - 결과에 다른 프로젝트 행(projectId 가 ctx.projectId 와 다름)이 섞이면 결과를 버린다.
 * - 사용자 지정 sqlSystemPrompt 는 이 도구에서만 쓰인다 (읽기 전용 고정 규칙 뒤에 붙음).
 */

import { generateSQL, selectRelevantTables, validateSQL } from "@/lib/llm/index";
import { runSafeSql } from "@/lib/llm/safe-sql";
import { obj, optString } from "./args";
import type { ChatTool } from "./types";

/** 결과 행 어딘가에 다른 프로젝트 ID 가 있으면 true */
function hasForeignProject(rows: unknown[], projectId: string): boolean {
  return rows.some((r) => {
    if (!r || typeof r !== "object") return false;
    return Object.entries(r as Record<string, unknown>).some(
      ([k, v]) => /^projectid$/i.test(k) && typeof v === "string" && v !== projectId
    );
  });
}

export const runReadonlySqlTool: ChatTool<{ question: string }> = {
  name: "run_readonly_sql",
  description:
    "다른 도구로 답할 수 없을 때만 쓴다. 질문을 넘기면 읽기 전용 SQL 을 만들어 실행하고 결과 행을 돌려준다. " +
    "진도율·지연율은 wbs_schedule_stats, 사람 찾기는 find_people, 목록은 list_* 도구를 먼저 쓴다.",
  parameters: {
    type: "object",
    properties: { question: { type: "string", description: "SQL 로 답할 질문 (사람 이름은 정확한 이름으로)" } },
    required: ["question"],
    additionalProperties: false,
  },
  kind: "read",
  parse(args) {
    const question = optString(obj(args).question);
    if (!question) throw new Error("question 이 필요합니다.");
    return { question };
  },
  async execute(ctx, { question }) {
    if (!ctx.llm) return { kind: "error", message: "LLM 클라이언트가 없습니다." };
    const tables = await selectRelevantTables(ctx.llm, question);
    const sql = await generateSQL(ctx.llm, question, ctx.projectId, ctx.user.id, ctx.promptConfig?.sqlSystemPrompt, tables);
    if (!sql) return { kind: "error", message: "SQL 로 답할 수 없는 질문입니다. 다른 도구를 쓰거나 바로 답하세요." };
    const v = validateSQL(sql);
    if (!v.valid) return { kind: "error", message: `SQL 검증 실패: ${v.error}` };
    try {
      const rows = (await runSafeSql(ctx.prisma, sql)) as Record<string, unknown>[];
      if (hasForeignProject(rows, ctx.projectId)) {
        return { kind: "error", message: "다른 프로젝트 데이터가 섞여 결과를 버렸습니다. 현재 프로젝트 조건으로 다시 질문하세요." };
      }
      const safe = JSON.parse(JSON.stringify(rows, (_, x) => (typeof x === "bigint" ? Number(x) : x))) as Record<string, unknown>[];
      return { kind: "data", summary: `SQL 조회 ${safe.length}행`, rows: safe.slice(0, 200) };
    } catch (e) {
      return { kind: "error", message: `SQL 실행 오류: ${e instanceof Error ? e.message.split("\n").slice(-1)[0] : String(e)}` };
    }
  },
};
