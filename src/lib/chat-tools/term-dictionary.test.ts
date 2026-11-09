/**
 * @file src/lib/chat-tools/term-dictionary.test.ts
 * @description
 * 한국어 표현 → Prisma Enum 사전이 모든 Enum 값을 덮는지, 자주 쓰는 표현을 담는지 검사합니다.
 *
 * 초보자 가이드:
 * - Prisma Enum 에 값이 추가되면 "covers every prisma enum value" 가 실패한다. 사전에 한국어 표현을 추가한다.
 * - 화면 라벨은 각 페이지에 흩어져 있으므로(예: issues/page.tsx 의 CRITICAL: "긴급") 사전은 이 파일 한 곳에 둔다.
 */

import { describe, expect, it } from "vitest";
import {
  IssueStatus, IssuePriority, TaskStatus, TaskPriority, FieldIssueStatus,
  DiscussionStatus, DiscussionPriority, RequirementStatus, ApplyStatus, MilestoneStatus,
  DiscussionStage, IssueCategory,
} from "@prisma/client";
import { TERM_DICTIONARY, termGuide } from "./term-dictionary";

const ENUMS = {
  issueStatus: IssueStatus,
  issuePriority: IssuePriority,
  taskStatus: TaskStatus,
  taskPriority: TaskPriority,
  fieldIssueStatus: FieldIssueStatus,
  discussionStatus: DiscussionStatus,
  discussionPriority: DiscussionPriority,
  requirementStatus: RequirementStatus,
  applyStatus: ApplyStatus,
  milestoneStatus: MilestoneStatus,
  discussionStage: DiscussionStage,
  issueCategory: IssueCategory,
} as const;

describe("TERM_DICTIONARY", () => {
  it.each(Object.entries(ENUMS))("covers every prisma enum value: %s", (key, e) => {
    const dict = TERM_DICTIONARY[key as keyof typeof ENUMS];
    expect(Object.keys(dict).sort()).toEqual(Object.values(e).sort());
    for (const words of Object.values(dict)) expect(words.length).toBeGreaterThan(0);
  });

  it("maps common Korean terms", () => {
    expect(TERM_DICTIONARY.issuePriority.CRITICAL).toContain("긴급");
    expect(TERM_DICTIONARY.issueStatus.OPEN).toEqual(expect.arrayContaining(["열린", "미해결"]));
    expect(TERM_DICTIONARY.taskPriority.HIGH).toContain("긴급");
    expect(TERM_DICTIONARY.discussionPriority.HIGH).toContain("긴급");
  });

  it("termGuide lists enum and words", () => {
    const g = termGuide("issuePriority");
    expect(g).toContain("CRITICAL");
    expect(g).toContain("긴급");
  });
});
