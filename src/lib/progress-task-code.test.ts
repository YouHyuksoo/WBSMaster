/**
 * @file src/lib/progress-task-code.test.ts
 * @description 진도 task 번호가 지워진 번호 · 사용자 코드와 무관하게 겹치지 않는지, 라우트가 이 함수를 쓰는지 검사합니다.
 * 초보자 가이드: 회귀 — 생성은 개수 + 1, 가져오기는 마지막 순서 + 1 이라 T-002 를 지우면 있는 T-003 이 다시 나왔다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lastProgressTaskNo, progressTaskCode } from "./progress-task-code";

it("중간 번호를 지워도 가장 큰 번호 다음을 쓴다", () => expect(progressTaskCode(lastProgressTaskNo(["T-001", "T-003"]) + 1)).toBe("T-004"));
it("비었거나 다른 형식이면 1번부터", () => expect(progressTaskCode(lastProgressTaskNo([null, "ABC", "T-x"]) + 1)).toBe("T-001"));
it("생성 · 가져오기 라우트가 번호를 직접 만들지 않는다", () => {
  for (const f of ["route.ts", "import/route.ts"]) {
    const src = readFileSync(join(process.cwd(), "src/app/api/progress-tasks", f), "utf8");
    expect(src, f).toContain("lastProgressTaskNo(");
    expect(src, f).not.toContain("`T-${");
  }
});
