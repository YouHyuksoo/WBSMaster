/**
 * @file src/lib/chat-intake/tool-target.ts
 * @description 기존 등록 도구도 공통 보완 루프를 통과하도록 분류합니다.
 * 초보자 가이드: 수정·삭제와 다른 메뉴 등록에는 적용하지 않습니다.
 */
import type { IntakeTarget } from "@/lib/chat-intake/types";
export function intakeTargetForTool(name: string, args: string): IntakeTarget | null {
  if (name === "propose_create_issue") return "issue";
  if (name === "propose_create_discussion_item") return "discussion_item";
  if (name === "propose_create_weekly_item") return "weekly_report";
  if (name === "propose_create_record") {
    try { return JSON.parse(args).entity === "interview" ? "interview" : null; } catch { return null; }
  }
  return null;
}
