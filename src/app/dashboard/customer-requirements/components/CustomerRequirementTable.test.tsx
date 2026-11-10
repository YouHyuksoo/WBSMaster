/**
 * @file src/app/dashboard/customer-requirements/components/CustomerRequirementTable.test.tsx
 * @description 실제 공용 그리드에서 요구사항 편집·이관·전체 결과 필터·페이지 이동을 검사합니다.
 * 초보자 가이드:
 * - 데이터와 저장 콜백은 가상 값이며 실제 API를 호출하지 않습니다.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerRequirementTable } from "./CustomerRequirementTable";
import type { CustomerRequirement } from "../types";

afterEach(cleanup);

function requirement(index: number, applyStatus: CustomerRequirement["applyStatus"] = "REVIEWING"): CustomerRequirement {
  return { id: `fixture-${index}`, sequence: index, code: `RQ-${String(index).padStart(3, "0")}`,
    category: "생산", functionName: `기능 ${index}`, content: `요구사항 ${index}`, solution: "적용방안",
    requestDate: "2026-11-10T00:00:00.000Z", completeDate: null, requester: "검증 담당자",
    applyStatus, remarks: "제약사항", toBeCode: null, createdAt: "2026-11-10", updatedAt: "2026-11-10", projectId: "fixture-project" };
}

function show(requirements: CustomerRequirement[], transfer = true) {
  const actions = { onEdit: vi.fn(), onDelete: vi.fn(), onStatusChange: vi.fn(),
    onTransferToDiscussion: transfer ? vi.fn() : undefined };
  return { ...render(<CustomerRequirementTable requirements={requirements} {...actions} />), actions };
}

function openFilters() {
  fireEvent.click(screen.getByTitle("그리드 옵션"));
  fireEvent.click(screen.getByText("컬럼 필터"));
}

describe("요구사항관리 jisung-ui 그리드", () => {
  it("수정·삭제·협의요청 이관과 상태 변경을 원본 요구사항에 연결한다", () => {
    const row = requirement(1);
    const { actions } = show([row]);
    fireEvent.click(screen.getByRole("button", { name: "RQ-001 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "RQ-001 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "RQ-001 협의요청으로 이관" }));
    fireEvent.change(screen.getByRole("combobox", { name: "RQ-001 상태" }), { target: { value: "APPROVED" } });
    expect(actions.onEdit).toHaveBeenCalledWith(row);
    expect(actions.onDelete).toHaveBeenCalledWith(row);
    expect(actions.onTransferToDiscussion).toHaveBeenCalledWith(row);
    expect(actions.onStatusChange).toHaveBeenCalledWith(row.id, "APPROVED");
  });

  it("정렬 후에도 상태 변경 대상 ID를 보존한다", () => {
    const { actions } = show([requirement(2), requirement(1)]);
    fireEvent.click(screen.getByText("요구번호"));
    const firstRow = within(document.querySelector("tbody")!).getAllByRole("row")[0];
    expect(firstRow.textContent).toContain("RQ-001");
    fireEvent.change(within(firstRow).getByRole("combobox"), { target: { value: "APPLIED" } });
    expect(actions.onStatusChange).toHaveBeenCalledWith("fixture-1", "APPLIED");
  });

  it("전체 25건에서 검색하며 다른 페이지의 요구사항도 찾는다", () => {
    show(Array.from({ length: 25 }, (_, i) => requirement(i + 1)));
    expect(screen.queryByRole("button", { name: "RQ-025 수정" })).toBeNull();
    fireEvent.click(screen.getByTitle("다음 페이지"));
    expect(screen.getByRole("button", { name: "RQ-025 수정" })).toBeTruthy();
    openFilters();
    fireEvent.change(screen.getByPlaceholderText("요구번호 검색"), { target: { value: "RQ-001" } });
    expect(screen.getByRole("button", { name: "RQ-001 수정" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "RQ-025 수정" })).toBeNull();
  });

  it("한글 상태 필터가 Enum 값과 일치하는 행만 남긴다", () => {
    show([requirement(1, "APPLIED"), requirement(2, "IN_DEVELOPMENT")]);
    openFilters();
    const filter = screen.getByRole("option", { name: "상태 전체" }).parentElement!;
    fireEvent.change(filter, { target: { value: "APPLIED" } });
    expect(screen.getByRole("button", { name: "RQ-001 수정" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "RQ-002 수정" })).toBeNull();
  });

  it("외부 필터 결과가 줄면 첫 페이지로 복귀하고 이관 콜백이 없으면 버튼을 숨긴다", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => requirement(i + 1));
    const { rerender, actions } = show(rows, false);
    expect(screen.queryByRole("button", { name: /협의요청으로 이관/ })).toBeNull();
    fireEvent.click(screen.getByTitle("다음 페이지"));
    await screen.findByRole("button", { name: "RQ-025 수정" });
    rerender(<CustomerRequirementTable requirements={rows.slice(0, 3)} {...actions} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "RQ-001 수정" })).toBeTruthy());
  });
});
