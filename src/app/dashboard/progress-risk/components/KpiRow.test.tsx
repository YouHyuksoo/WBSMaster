import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiRow } from "./KpiRow";
import type { ProgressTask } from "../types";
import type { Diagnosis } from "@/lib/progress-calc/types";

function makeTask(overrides: Partial<ProgressTask> = {}): ProgressTask {
  return {
    id: "task-1",
    projectId: "project-1",
    code: "T-001",
    name: "테스트 task",
    category: null,
    businessUnit: null,
    description: null,
    order: 0,
    startDate: "2026-01-01",
    endDate: "2026-01-10",
    actualStartDate: null,
    actualEndDate: null,
    stageCategory: "MES_SYSTEM",
    currentStageId: null,
    status: "IN_PROGRESS",
    progress: 0,
    effortMd: 5,
    predecessorId: null,
    isParallel: true,
    assignees: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("KpiRow", () => {
  it("공수 부족 진단 안내를 KPI 카드 행 안에 표시한다", () => {
    const diagnosis: Diagnosis = {
      verdict: "RESOURCE_SHORTAGE",
      overrunDays: 0,
      shortageMd: 3.5,
      criticalPath: ["task-1"],
      recommendations: [],
      categoryOverruns: [],
    };

    render(
      <KpiRow
        tasks={[makeTask()]}
        conflicts={[]}
        diagnosis={diagnosis}
        projectEndDate={new Date("2026-02-01")}
      />
    );

    const alert = screen.getByRole("alert");
    const text = alert.textContent ?? "";

    expect(text).toContain("공수 부족");
    expect(text).toContain("-3.5 MD");
    expect(text).toContain("Critical Path: T-001");
    expect(alert.className).toContain("border-border");
    expect(alert.className).not.toContain("bg-error/5");
  });

  it("사업부별 task와 일정 초과만 요약 카드에 표시하고 총 공수와 충돌 인원은 표시하지 않는다", () => {
    const diagnosis: Diagnosis = {
      verdict: "SCHEDULE_OVERRUN",
      overrunDays: 2,
      shortageMd: 0,
      criticalPath: [],
      recommendations: [],
      categoryOverruns: [],
    };

    render(
      <KpiRow
        tasks={[
          makeTask({ id: "task-1", businessUnit: "V_IVI" }),
          makeTask({ id: "task-2", businessUnit: "V_IVI" }),
          makeTask({ id: "task-3", businessUnit: "V_DISP" }),
        ]}
        conflicts={[{ userId: "user-1", week: "2026-W01", sumPct: 120, overflow: 20 }]}
        diagnosis={diagnosis}
      />
    );

    const summary = screen.getByLabelText("진도 요약");
    const text = summary.textContent ?? "";

    expect(text).not.toContain("총 task");
    expect(text).toContain("V_IVI");
    expect(text).toContain("V_DISP");
    expect(text).not.toContain("총 공수");
    expect(text).toContain("일정 초과");
    expect(text).not.toContain("충돌 인원");
    expect(text).toContain("정상 진행 3/3");
    expect(screen.queryByText("정상 진행", { selector: "p.text-\\[10px\\]" })).toBeNull();
    expect(summary.querySelector(".grid-cols-4")).toBeNull();
    expect(summary.querySelector(".items-center")).not.toBeNull();
  });
});
