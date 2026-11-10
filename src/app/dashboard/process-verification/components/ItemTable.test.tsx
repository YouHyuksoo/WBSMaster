/**
 * @file src/app/dashboard/process-verification/components/ItemTable.test.tsx
 * @description 실제 jisung-ui 그리드에서 편집 연결·필터·정렬·페이지 이동을 검증합니다.
 * 초보자 가이드:
 * - 모든 행은 가상 데이터이며 저장 콜백은 목 함수로 대체합니다.
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ItemTable from "./ItemTable";
import type { ProcessVerificationMaster } from "../types";

afterEach(cleanup);

function item(index: number, applied = false): ProcessVerificationMaster {
  return {
    id: `master-${index}`, managementCode: `TEST-${String(index).padStart(3, "0")}`,
    productType: "SMD", category: "생산", managementArea: "생산계획", detailItem: `검증 항목 ${index}`,
    mesMapping: "MES", verificationDetail: "긴 세부검증내용을 끝까지 확인할 수 있습니다.",
    acceptanceStatus: "수용", existingMes: false, customerRequest: null, asIsCode: null,
    toBeCode: null, order: index, remarks: null, categoryId: "fixture-category",
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    businessUnitApplies: applied ? [{ id: `apply-${index}`, masterId: `master-${index}`,
      businessUnit: "POLE", isApplied: true, status: "VERIFIED", createdAt: "2026-01-01", updatedAt: "2026-01-01" }] : [],
  };
}

function show(items: ProcessVerificationMaster[]) {
  const actions = { onApplyChange: vi.fn().mockResolvedValue(undefined), onEditItem: vi.fn(), onDeleteItem: vi.fn() };
  return { ...render(<ItemTable items={items} {...actions} />), ...actions };
}

function openFilters() {
  fireEvent.click(screen.getByTitle("그리드 옵션"));
  fireEvent.click(screen.getByText("컬럼 필터"));
}

describe("기능추적표 jisung-ui 전환", () => {
  it("적용 행이 없어도 미적용·대기로 표시하고 기존 저장·수정·삭제 콜백을 연결한다", () => {
    const row = item(1);
    const actions = show([row]);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "TEST-001 적용" }).checked).toBe(false);
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "TEST-001 검증 상태" }).value).toBe("PENDING");
    fireEvent.click(screen.getByRole("checkbox", { name: "TEST-001 적용" }));
    expect(actions.onApplyChange).toHaveBeenCalledWith(row.id, { isApplied: true });
    fireEvent.change(screen.getByRole("combobox", { name: "TEST-001 검증 상태" }), { target: { value: "IN_PROGRESS" } });
    expect(actions.onApplyChange).toHaveBeenCalledWith(row.id, { status: "IN_PROGRESS" });
    fireEvent.click(screen.getByRole("button", { name: "TEST-001 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "TEST-001 삭제" }));
    expect(actions.onEditItem).toHaveBeenCalledWith(row);
    expect(actions.onDeleteItem).toHaveBeenCalledWith(row);
  });

  it("정렬 후에도 관리코드와 저장 대상 ID가 일치한다", () => {
    const actions = show([item(2), item(1)]);
    fireEvent.click(screen.getByText("관리코드"));
    const rows = within(document.querySelector("tbody")!).getAllByRole("row");
    expect(rows[0].textContent).toContain("TEST-001");
    fireEvent.click(within(rows[0]).getByRole("checkbox"));
    expect(actions.onApplyChange).toHaveBeenCalledWith("master-1", { isApplied: true });
  });

  it("적용 여부·검증 상태 필터가 원본 행이 아닌 표시값으로 동작한다", () => {
    show([item(1), item(2, true)]);
    openFilters();
    const applied = screen.getByRole("option", { name: "적용 여부 전체" }).parentElement!;
    fireEvent.change(applied, { target: { value: "적용" } });
    expect(screen.queryByRole("checkbox", { name: "TEST-001 적용" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "TEST-002 적용" })).toBeTruthy();
    const status = screen.getByRole("option", { name: "검증 상태 전체" }).parentElement!;
    fireEvent.change(status, { target: { value: "대기" } });
    expect(screen.getByText("항목이 없습니다.")).toBeTruthy();
    fireEvent.change(applied, { target: { value: "" } });
    expect(screen.getByRole("checkbox", { name: "TEST-001 적용" })).toBeTruthy();
  });

  it("AS-IS 관리번호는 가로 스크롤 없이 보이도록 관리코드 바로 다음 칸이다", () => {
    show([item(1)]);
    const headers = [...document.querySelectorAll("thead th")].map((th) => th.textContent ?? "");
    const code = headers.findIndex((h) => h.includes("관리코드"));
    expect(code).toBeGreaterThanOrEqual(0);
    expect(headers[code + 1]).toContain("AS-IS 관리번호");
  });

  it("20행씩 이동하며 컬럼 검색 시 첫 페이지로 돌아온다", () => {
    show(Array.from({ length: 21 }, (_, i) => item(i + 1)));
    expect(screen.queryByRole("checkbox", { name: "TEST-021 적용" })).toBeNull();
    fireEvent.click(screen.getByTitle("다음 페이지"));
    expect(screen.getByRole("checkbox", { name: "TEST-021 적용" })).toBeTruthy();
    openFilters();
    fireEvent.change(screen.getByPlaceholderText("관리코드 검색"), { target: { value: "TEST-001" } });
    expect(screen.getByRole("checkbox", { name: "TEST-001 적용" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "TEST-021 적용" })).toBeNull();
  });
});
