/**
 * @file src/lib/chat-tools/ontology.test.ts
 * @description 온톨로지 채팅 도구가 프로젝트를 서버에서 정하고, 서버 오류 이유를 LLM 에 넘기고, 행 수를 줄이는지 검증합니다.
 * 초보자 가이드: 지식 서버는 fetch 대역으로 바꾸므로 실제 시스템에 접속하지 않습니다.
 */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkOntologyRulesTool, queryOntologyTool, resolveOntologyTermsTool, traverseOntologyRelationsTool } from "./ontology";
import { clearOntologyDictionaryCache } from "@/lib/knowledge/ontology";
import type { ToolContext } from "./types";

const ctx = { projectId: "p1" } as unknown as ToolContext;
const record = (i: number) => ({ concept: "work_package", concept_label: "작업 분류 항목", key: { id: `w${i}` },
  attributes: { work_package_status: { label: "상태", value: "in_progress", value_label: "진행 중" } } });
const dictionary = { version: 6, elements: [
  { id: "work_package", kind: "concept", labels: { ko: "작업 분류 항목" } },
  { id: "work_package_status", kind: "attribute", concept: "work_package", datatype: "string", value_set: "wp_status", labels: { ko: "상태" } },
  { id: "wp_status", kind: "value_set", values: [{ code: "in_progress", labels: { ko: "진행 중" } }] },
  { id: "wp_parent", kind: "relation", from_concept: "work_package", to_concept: "work_package", labels: { ko: "상위 항목" } },
  { id: "wp_required", kind: "rule", target: "work_package", labels: { ko: "식별자 필수" } },
] };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let calls: { url: string; body?: Record<string, unknown> }[] = [];

beforeEach(() => {
  vi.stubEnv("KNOWLEDGE_API_URL", "https://fixture.test/knowledge"); vi.stubEnv("KNOWLEDGE_SOURCE_ID", "eval"); vi.stubEnv("KNOWLEDGE_API_KEY", "fixture");
  calls = []; clearOntologyDictionaryCache();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function serve(handler: (url: string, body?: Record<string, unknown>) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, body });
    return handler(url, body);
  }));
}

it("조회는 현재 프로젝트 범위를 서버가 만들고 행을 공통 값 이름으로 펼친다", async () => {
  serve(() => json(200, { version: 6, records: Array.from({ length: 80 }, (_, i) => record(i)), truncated: false }));
  const args = queryOntologyTool.parse({ concept: "work_package", where: { op: "compare", attribute: "work_package_status", operator: "eq", value: "in_progress" }, limit: 30 });
  const result = await queryOntologyTool.execute(ctx, args);
  expect(calls[0].url).toBe("https://fixture.test/knowledge/api/ontology/query");
  expect(calls[0].body).toMatchObject({ source: "wbs", source_id: "eval", external_project: "p1", project: "wbs_4_eval_p1", concept: "work_package" });
  expect(result).toMatchObject({ kind: "data", summary: expect.stringContaining("80건") });
  if (result.kind !== "data") throw new Error("data expected");
  expect(result.rows).toHaveLength(30);
  expect(result.rows?.[0]).toMatchObject({ key: "w0", 상태: "진행 중" });
});

it("LLM 이 프로젝트를 넣으면 거절한다", () => {
  expect(() => queryOntologyTool.parse({ concept: "work_package", project: "wbs_4_eval_other" })).toThrow(/프로젝트는 서버/);
  expect(() => checkOntologyRulesTool.parse({ external_project: "other" })).toThrow(/허용하지 않는/);
});

it("서버의 422 이유를 넘기고, 대응이 없으면 0건이 아니라 다른 도구로 넘어가라고 한다", async () => {
  serve(() => json(422, { detail: { code: "QUERY_NOT_BUILDABLE", message: "value done of work_package_status has no source code in wbs" } }));
  const bad = await queryOntologyTool.execute(ctx, queryOntologyTool.parse({ concept: "work_package" }));
  expect(bad).toMatchObject({ kind: "error", message: expect.stringContaining("value done") });
  serve(() => json(422, { detail: { code: "QUERY_NOT_BUILDABLE", message: "concept requirement has no mapping in wbs" } }));
  const missing = await queryOntologyTool.execute(ctx, queryOntologyTool.parse({ concept: "requirement" }));
  expect(missing).toMatchObject({ kind: "error", message: expect.stringContaining("0건이라고 말하지 말고") });
});

it("용어 해석은 맞은 개념의 속성 · 값 코드 · 관계 · 규칙 이름표를 준다", async () => {
  serve((url) => url.endsWith("/resolve")
    ? json(200, { version: 6, matches: [{ kind: "value", id: "wp_status:in_progress", code: "in_progress", label: "진행 중", attributes: ["work_package_status"] }] })
    : json(200, dictionary));
  const result = await resolveOntologyTermsTool.execute(ctx, resolveOntologyTermsTool.parse({ question: "진행 중인 항목" }));
  if (result.kind !== "data") throw new Error("data expected");
  expect(result.rows?.[0]).toMatchObject({ concept: "work_package", attributes: [{ id: "work_package_status", values: ["in_progress=진행 중"] }],
    relations: [{ id: "wp_parent" }], rules: [{ id: "wp_required" }] });
});

it("관계 따라가기와 규칙 검사도 서버 범위를 쓰고, 검사 안 함을 위반 없음으로 세지 않는다", async () => {
  serve((url) => url.endsWith("/traverse")
    ? json(200, { version: 6, nodes: [record(1)], edges: [{ relation: "wp_parent" }], truncated: false })
    : json(200, { version: 6, results: [{ rule: "a", status: "checked", count: 2, violations: [record(2)] }, { rule: "b", status: "skipped", reason: "대응 없음" }] }));
  await traverseOntologyRelationsTool.execute(ctx, traverseOntologyRelationsTool.parse({ concept: "work_package", keys: ["w1"], relations: [{ relation: "wp_parent", direction: "out" }] }));
  expect(calls[0].body).toMatchObject({ project: "wbs_4_eval_p1", keys: ["w1"], relations: [["wp_parent", "out"]], depth: 1 });
  const rules = await checkOntologyRulesTool.execute(ctx, checkOntologyRulesTool.parse({}));
  expect(rules).toMatchObject({ kind: "data", summary: expect.stringContaining("2개 중 1개 검사, 어긴 규칙 1개") });
});

it("지식관리 설정이 없으면 오류로 알린다", async () => {
  vi.unstubAllEnvs();
  vi.stubEnv("KNOWLEDGE_API_URL", ""); vi.stubEnv("KNOWLEDGE_SOURCE_ID", ""); vi.stubEnv("KNOWLEDGE_API_KEY", "");
  expect(await checkOntologyRulesTool.execute(ctx, {})).toMatchObject({ kind: "error" });
});
