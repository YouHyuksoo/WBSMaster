/**
 * @file src/app/dashboard/as-is-analysis/components/AsIsGrids.test.tsx
 * @description AS-IS 11개 그리드의 값·편집 연결과 공통 삭제 확인을 검사합니다.
 * 초보자 가이드:
 * - 모든 저장 훅을 대체하여 실제 데이터에 접근하지 않습니다.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeDefinitionTable } from "./CodeDefinitionTable";
import { DataModelTable } from "./DataModelTable";
import { DocumentAnalysisTable } from "./DocumentAnalysisTable";
import { DocumentTable } from "./DocumentTable";
import { FunctionTable } from "./FunctionTable";
import { InterfaceTable } from "./InterfaceTable";
import { IssueTable } from "./IssueTable";
import { ProcessDefinitionTable } from "./ProcessDefinitionTable";
import { ResponsibilityTable } from "./ResponsibilityTable";
import { ScreenTable } from "./ScreenTable";
import { OverviewGrid } from "./OverviewGrid";
import { AsIsDetailGrid } from "./AsIsDetailGrid";
import type { AsIsUnitAnalysis, AsIsOverviewItem } from "../types";

const writes = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), delete: vi.fn(), isCreating: false, isUpdating: false, isDeleting: false }));
vi.mock("../hooks/useAsIsAnalysis", () => Object.fromEntries([
  "Responsibility", "Issue", "Document", "DocumentAnalysis", "Function", "Screen", "Interface", "DataModel", "CodeDefinition",
].map(name => [`useAsIs${name}`, () => writes])));
vi.mock("../hooks/useAsIsProcessDefinition", () => ({ useAsIsProcessDefinition: () => writes }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const base = { id: "fixture-row", order: 1, createdAt: "2026-11-10", updatedAt: "2026-11-10", unitAnalysisId: "fixture-unit" };
const unit: AsIsUnitAnalysis = {
  id: "fixture-unit", overviewItemId: "fixture-item", createdAt: "2026-11-10", updatedAt: "2026-11-10",
  processDefinitions: [{ ...base, stepNumber: 1, processName: "가상 프로세스" }],
  responsibilities: [{ ...base, role: "가상 역할", responsibility: "업무 책임" }],
  issues: [{ ...base, issueType: "OTHER", title: "가상 이슈", priority: "HIGH" }],
  documents: [{ ...base, documentName: "가상 문서" }],
  documentAnalyses: [{ ...base, documentName: "가상 구조문서", fieldName: "필드", isMandatory: true }],
  functions: [{ ...base, functionName: "가상 기능", importance: "HIGH" }],
  screens: [{ ...base, screenName: "가상 화면" }],
  interfaces: [{ ...base, interfaceName: "가상 인터페이스" }],
  dataModels: [{ ...base, tableName: "FIXTURE_TABLE", isPrimaryKey: true, isForeignKey: false, isNullable: false }],
  codeDefinitions: [{ ...base, codeGroup: "FIXTURE_GROUP", codeValue: "A", codeName: "가상 코드", isActive: true }],
};

const cases = [
  [ProcessDefinitionTable, "가상 프로세스"], [ResponsibilityTable, "가상 역할"], [IssueTable, "가상 이슈"],
  [DocumentTable, "가상 문서"], [DocumentAnalysisTable, "가상 구조문서"], [FunctionTable, "가상 기능"],
  [ScreenTable, "가상 화면"], [InterfaceTable, "가상 인터페이스"], [DataModelTable, "FIXTURE_TABLE"],
  [CodeDefinitionTable, "가상 코드"],
] as const;

describe("AS-IS 단위업무 공용 그리드", () => {
  it.each(cases.map(([Component, value]) => ({ Component, value, name: Component.name })))("$name에서 기존 수정 모달에 올바른 값을 전달한다", ({ Component, value }) => {
    render(<Component unitAnalysis={unit} />);
    expect(screen.getByRole("table")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "fixture-row 수정" }));
    expect(screen.getByDisplayValue(value)).toBeTruthy();
    expect(writes.update).not.toHaveBeenCalled();
  });
  it("삭제 확인·취소 후 원본 ID로 삭제 훅을 호출한다", () => {
    render(<ResponsibilityTable unitAnalysis={unit} />);
    fireEvent.click(screen.getByRole("button", { name: "fixture-row 삭제" }));
    expect(writes.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "fixture-row 삭제 취소" }));
    fireEvent.click(screen.getByRole("button", { name: "fixture-row 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "fixture-row 삭제 확인" }));
    expect(writes.delete).toHaveBeenCalledWith("fixture-row", expect.objectContaining({ onSuccess: expect.any(Function) }));
  });
  it("공통 상세 그리드에서 다른 페이지의 행을 검색한다", () => {
    render(<AsIsDetailGrid rows={Array.from({ length: 25 }, (_, index) => ({ id: String(index), name: `업무-${index}` }))}
      fields={[{ key: "name", label: "업무명" }]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByTitle("그리드 옵션"));
    fireEvent.click(screen.getByText("컬럼 필터"));
    fireEvent.change(screen.getByPlaceholderText("업무명 검색"), { target: { value: "업무-24" } });
    expect(screen.getByRole("button", { name: "24 수정" })).toBeTruthy();
  });
  it("코드 사용 필터가 미사용을 포함하지 않는다", () => {
    const code = unit.codeDefinitions![0];
    render(<CodeDefinitionTable unitAnalysis={{ ...unit, codeDefinitions: [code, { ...code, id: "inactive-code", isActive: false }] }} />);
    fireEvent.click(screen.getByTitle("그리드 옵션"));
    fireEvent.click(screen.getByText("컬럼 필터"));
    const filter = screen.getByRole("option", { name: "사용 검색" }).parentElement!;
    fireEvent.change(filter, { target: { value: "사용" } });
    expect(screen.getByRole("button", { name: "fixture-row 수정" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "inactive-code 수정" })).toBeNull();
  });
});

function overviewItem(index: number): AsIsOverviewItem {
  return { id: `overview-${index}`, asIsManagementNo: `AS-${index}`, majorCategory: "MASTER", middleCategory: "기준정보",
    taskName: `업무 ${index}`, currentMethod: "SYSTEM", order: index, createdAt: "2026-11-10", updatedAt: "2026-11-10", overviewId: "fixture-overview" };
}

describe("AS-IS 총괄 공용 그리드", () => {
  it("정렬·검색 뒤에도 분석·수정·삭제가 원본 업무를 가리킨다", async () => {
    const actions = { onSelectItem: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
    const rows = Array.from({ length: 25 }, (_, index) => overviewItem(index + 1));
    render(<OverviewGrid items={rows} selectedItem={null} {...actions} />);
    fireEvent.click(screen.getByTitle("그리드 옵션"));
    fireEvent.click(screen.getByText("컬럼 필터"));
    fireEvent.change(screen.getByPlaceholderText("업무명 검색"), { target: { value: "업무 25" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "AS-25 분석" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "AS-25 분석" }));
    fireEvent.click(screen.getByRole("button", { name: "AS-25 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "AS-25 삭제" }));
    for (const callback of Object.values(actions)) expect(callback).toHaveBeenCalledWith(rows[24]);
    expect(within(document.querySelector("tbody")!).getByText("기준관리")).toBeTruthy();
  });
});
