import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { applyFilters, type Filters } from "./FilterBar";
import { FilterBar } from "./FilterBar";
import type { ProgressTask } from "../types";

function makeTask(overrides: Partial<ProgressTask>): ProgressTask {
  return {
    id: "task-1",
    projectId: "project-1",
    code: "T-001",
    name: "테스트 task",
    category: "기준관리",
    businessUnit: null,
    description: null,
    order: 0,
    startDate: "2026-01-01",
    endDate: "2026-01-10",
    actualStartDate: null,
    actualEndDate: null,
    stageCategory: "MES_SYSTEM",
    currentStageId: null,
    status: "PENDING",
    progress: 0,
    effortMd: null,
    predecessorId: null,
    isParallel: true,
    assignees: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

const baseFilters: Filters = {
  search: "",
  status: "all",
  businessUnit: "",
  category: "",
  majorCategory: "",
};

describe("applyFilters", () => {
  it("filters by business unit", () => {
    const tasks = [
      makeTask({ id: "sales", businessUnit: "Sales" }),
      makeTask({ id: "factory", businessUnit: "Factory" }),
    ];

    const filtered = applyFilters(tasks, { ...baseFilters, businessUnit: "Sales" });

    expect(filtered.map((task) => task.id)).toEqual(["sales"]);
  });

  it("filters by category", () => {
    const tasks = [
      makeTask({ id: "mes", stageCategory: "MES_SYSTEM" }),
      makeTask({ id: "erp", stageCategory: "ERP_IF" }),
    ];

    const filtered = applyFilters(tasks, { ...baseFilters, category: "ERP_IF" });

    expect(filtered.map((task) => task.id)).toEqual(["erp"]);
  });

  it("filters by major category", () => {
    const tasks = [
      makeTask({ id: "master", category: "기준관리" }),
      makeTask({ id: "quality", category: "품질관리" }),
    ];

    const filtered = applyFilters(tasks, { ...baseFilters, majorCategory: "품질관리" });

    expect(filtered.map((task) => task.id)).toEqual(["quality"]);
  });

  it("renders category condition", () => {
    render(
      createElement(FilterBar, {
        tasks: [makeTask({ stageCategory: "MES_SYSTEM" }), makeTask({ stageCategory: "ERP_IF" })],
        filters: baseFilters,
        onChange: () => undefined,
      })
    );

    expect(screen.getByRole("combobox", { name: "카테고리" })).toBeTruthy();
    expect(screen.getByText("ERP I/F")).toBeTruthy();
  });

  it("renders major category condition", () => {
    render(
      createElement(FilterBar, {
        tasks: [makeTask({ category: "기준관리" }), makeTask({ category: "품질관리" })],
        filters: baseFilters,
        onChange: () => undefined,
      })
    );

    expect(screen.getByRole("combobox", { name: "대분류" })).toBeTruthy();
    expect(screen.getByText("품질관리")).toBeTruthy();
  });

  it("filters major category options by selected category", () => {
    render(
      createElement(FilterBar, {
        tasks: [
          makeTask({ stageCategory: "MES_SYSTEM", category: "기준관리" }),
          makeTask({ stageCategory: "ERP_IF", category: "ERP기준" }),
        ],
        filters: { ...baseFilters, category: "ERP_IF" },
        onChange: () => undefined,
      })
    );

    expect(screen.getByText("ERP기준")).toBeTruthy();
    expect(screen.queryByText("기준관리")).toBeNull();
  });

  it("clears major category when category changes", () => {
    const onChange = vi.fn();

    render(
      createElement(FilterBar, {
        tasks: [makeTask({ stageCategory: "MES_SYSTEM", category: "기준관리" })],
        filters: { ...baseFilters, majorCategory: "기준관리" },
        onChange,
      })
    );

    fireEvent.change(screen.getByRole("combobox", { name: "카테고리" }), {
      target: { value: "MES_SYSTEM" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...baseFilters,
      category: "MES_SYSTEM",
      majorCategory: "",
    });
  });

  it("does not render assignee condition", () => {
    render(
      createElement(FilterBar, {
        tasks: [makeTask({ assignees: [] })],
        filters: baseFilters,
        onChange: () => undefined,
      })
    );

    expect(screen.queryByText("담당자")).toBeNull();
  });

  it("filters by status", () => {
    const tasks = [
      makeTask({ id: "pending", status: "PENDING" }),
      makeTask({ id: "delayed", status: "DELAYED" }),
    ];

    const filtered = applyFilters(tasks, { ...baseFilters, status: "DELAYED" });

    expect(filtered.map((task) => task.id)).toEqual(["delayed"]);
  });

  it("renders status condition", () => {
    const onChange = vi.fn();

    render(
      createElement(FilterBar, {
        tasks: [makeTask({ status: "IN_PROGRESS" })],
        filters: baseFilters,
        onChange,
      })
    );

    const select = screen.getByRole("combobox", { name: "상태" });
    expect(select).toBeTruthy();
    expect(screen.getByText("진행중")).toBeTruthy();

    fireEvent.change(select, { target: { value: "IN_PROGRESS" } });

    expect(onChange).toHaveBeenCalledWith({
      ...baseFilters,
      status: "IN_PROGRESS",
    });
  });
});
