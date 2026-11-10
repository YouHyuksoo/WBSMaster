/**
 * @file src/app/dashboard/to-be/components/SuggestPanel.test.tsx
 * @description AI 제안 패널: 고른 칸만 보내고(연결 AS-IS · WBS 는 보내지 않음), SFR 은 더하고, 개선 매핑은 기존 것을 지키는지 검증합니다.
 * 초보자 가이드:
 * - 저장은 부모 콜백(가짜)으로만 확인한다
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ToBeDesign, ToBeSuggestion } from "@/lib/api";
import { SuggestPanel, mergeSuggestedFixes } from "./SuggestPanel";

const item = {
  id: "t1", toBeManagementNo: "TB-017", changeType: "IMPROVE", targetMethod: "SYSTEM", priority: "HIGH", summary: "기존 요약", sfrCodes: ["SFR-012"],
  fixes: [{ id: "f1", asIsIssueId: null, issueTitle: "기존 문제", solution: "기존 해결", result: "PARTIAL" }],
} as unknown as ToBeDesign["item"];
const suggestion: ToBeSuggestion = {
  changeType: "IMPROVE", targetMethod: "AUTO", priority: "HIGH", summary: "새 요약", sfrCodes: ["SFR-012", "SFR-027"],
  fixes: [{ issue: "TAG 지연", solution: "1차 확정" }], reason: "근거", droppedSfr: [], interviewCount: 0,
};

describe("AI 제안 패널", () => {
  it("값이 다른 칸만 골라 보내고, SFR 은 기존 코드에 더하며, 연결 AS-IS · WBS 는 보내지 않는다", async () => {
    const onApply = vi.fn(async () => true);
    render(<SuggestPanel item={item} suggestion={suggestion} busy={false} onApplyOverview={onApply} onAddFixes={vi.fn(async () => true)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("개선 요약 적용"));
    fireEvent.click(screen.getByRole("button", { name: /개요에 적용/ }));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0]).toEqual([{ targetMethod: "AUTO", sfrCodes: ["SFR-012", "SFR-027"] }]);
  });

  it("개선 매핑은 기존 매핑을 앞에 그대로 두고 제안은 미해결로 더한다", () => {
    expect(mergeSuggestedFixes(item.fixes, suggestion.fixes)).toEqual([
      { asIsIssueId: null, issueTitle: "기존 문제", solution: "기존 해결", result: "PARTIAL" },
      { asIsIssueId: null, issueTitle: "TAG 지연", solution: "1차 확정", result: "OPEN" },
    ]);
  });
});
