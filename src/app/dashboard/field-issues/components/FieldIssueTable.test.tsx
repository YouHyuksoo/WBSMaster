/**
 * @file src/app/dashboard/field-issues/components/FieldIssueTable.test.tsx
 * @description 실제 공용 그리드에서 이슈 편집 연결·상태·전체 결과 검색을 검증합니다.
 * 초보자 가이드:
 * - 가상 행과 목 콜백만 사용하며 실제 API를 호출하지 않습니다.
 */
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldIssueTable } from "./FieldIssueTable";
import type { FieldIssue } from "../types";
afterEach(cleanup);

function issue(index: number, status: FieldIssue["status"] = "OPEN"): FieldIssue {
  return { id: `fixture-${index}`, sequence: index, code: `IS-${String(index).padStart(3, "0")}`,
    category: "생산", title: `이슈 ${index}`, description: `설명 ${index}`, issuer: "등록자", assignee: "담당자",
    status, registeredDate: "2026-11-10", targetDate: "2026-12-01", completedDate: null,
    proposedSolution: "제안", finalSolution: null, createdAt: "2026-11-10", updatedAt: "2026-11-10", projectId: "fixture" };
}

function show(issues: FieldIssue[], transfer = true) {
  const actions = { onEdit: vi.fn(), onDelete: vi.fn(), onStatusChange: vi.fn(), onTransferToDiscussion: transfer ? vi.fn() : undefined };
  return { ...render(<FieldIssueTable issues={issues} {...actions} />), actions };
}
function openFilters() {
  fireEvent.click(screen.getByTitle("그리드 옵션"));
  fireEvent.click(screen.getByText("컬럼 필터"));
}

describe("이슈사항관리 jisung-ui 그리드", () => {
  it("수정·삭제·협의요청 이관과 상태 변경을 원본 행에 연결한다", () => {
    const row = issue(1);
    const { actions } = show([row]);
    fireEvent.click(screen.getByRole("button", { name: "IS-001 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "IS-001 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "IS-001 협의요청으로 이관" }));
    fireEvent.change(screen.getByRole("combobox", { name: "IS-001 상태" }), { target: { value: "IN_PROGRESS" } });
    expect(actions.onEdit).toHaveBeenCalledWith(row);
    expect(actions.onDelete).toHaveBeenCalledWith(row);
    expect(actions.onTransferToDiscussion).toHaveBeenCalledWith(row);
    expect(actions.onStatusChange).toHaveBeenCalledWith(row.id, "IN_PROGRESS");
  });
  it("정렬 뒤에도 상태 변경 ID가 원본 이슈를 가리킨다", () => {
    const { actions } = show([issue(2), issue(1)]);
    fireEvent.click(screen.getByText("이슈번호"));
    const first = within(document.querySelector("tbody")!).getAllByRole("row")[0];
    expect(first.textContent).toContain("IS-001");
    fireEvent.change(within(first).getByRole("combobox"), { target: { value: "RESOLVED" } });
    expect(actions.onStatusChange).toHaveBeenCalledWith("fixture-1", "RESOLVED");
  });
  it("다른 페이지의 이슈도 전체 조회 결과에서 검색한다", () => {
    show(Array.from({ length: 25 }, (_, i) => issue(i + 1)));
    expect(screen.queryByRole("button", { name: "IS-025 수정" })).toBeNull();
    fireEvent.click(screen.getByTitle("다음 페이지"));
    expect(screen.getByRole("button", { name: "IS-025 수정" })).toBeTruthy();
    openFilters();
    fireEvent.change(screen.getByPlaceholderText("이슈번호 검색"), { target: { value: "IS-001" } });
    expect(screen.getByRole("button", { name: "IS-001 수정" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "IS-025 수정" })).toBeNull();
  });
  it("완료와 레거시 처리완료 상태를 구분하고 기존 취소선을 유지한다", () => {
    show([issue(1, "CLOSED"), issue(2, "COMPLETED")]);
    expect(screen.getByText("이슈 2").className).toContain("line-through");
    openFilters();
    const filter = screen.getByRole("option", { name: "상태 전체" }).parentElement!;
    fireEvent.change(filter, { target: { value: "COMPLETED" } });
    expect(screen.queryByRole("button", { name: "IS-001 수정" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "IS-002 상태" }).getAttribute("aria-label")).toBe("IS-002 상태");
    fireEvent.change(filter, { target: { value: "CLOSED" } });
    expect(screen.getByRole("button", { name: "IS-001 수정" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "IS-002 수정" })).toBeNull();
  });
  it("외부 필터 결과가 줄면 첫 페이지로 복귀하고 이관 콜백이 없으면 숨긴다", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => issue(i + 1));
    const { actions, rerender } = show(rows, false);
    expect(screen.queryByRole("button", { name: /협의요청으로 이관/ })).toBeNull();
    fireEvent.click(screen.getByTitle("다음 페이지"));
    await screen.findByRole("button", { name: "IS-025 수정" });
    rerender(<FieldIssueTable issues={rows.slice(0, 3)} {...actions} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "IS-001 수정" })).toBeTruthy());
  });
});
