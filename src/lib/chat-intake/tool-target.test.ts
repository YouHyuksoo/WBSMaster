/**
 * @file src/lib/chat-intake/tool-target.test.ts
 * @description 기존 등록 도구로 공통 보완 루프를 우회할 수 없는지 확인합니다.
 * 초보자 가이드: 네 업무 생성만 공통 루프로 연결하며 수정·삭제는 유지합니다.
 */
import { expect, it } from "vitest";
import { intakeTargetForTool } from "./tool-target";
it("네 업무의 기존 생성 도구를 초안 흐름으로 보낸다", () => {
  expect(intakeTargetForTool("propose_create_record", '{"entity":"interview"}')).toBe("interview");
  expect(intakeTargetForTool("propose_create_issue", "{}")).toBe("issue");
  expect(intakeTargetForTool("propose_create_discussion_item", "{}")).toBe("discussion_item");
  expect(intakeTargetForTool("propose_create_weekly_item", "{}")).toBe("weekly_report");
});
it("다른 업무·수정·삭제 도구는 유지한다", () => {
  expect(intakeTargetForTool("propose_update_record", '{"entity":"interview"}')).toBeNull();
  expect(intakeTargetForTool("propose_create_record", '{"entity":"document"}')).toBeNull();
});
