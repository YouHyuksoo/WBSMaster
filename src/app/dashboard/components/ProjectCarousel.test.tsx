/**
 * @file src/app/dashboard/components/ProjectCarousel.test.tsx
 * @description 대시보드 상단이 프로젝트 하나씩 보여 주고 좌 · 우 버튼과 ← → 로 바뀌는지 검증합니다.
 * 초보자 가이드:
 * - 카드 · 현황 패널은 이름만 그리는 목으로 바꿔 서버 호출 없이 검사한다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ selected: "p2" as string | null }));
vi.mock("@/contexts", () => ({ useProject: () => ({ selectedProjectId: ctx.selected }) }));
vi.mock("@/app/dashboard/components/ProjectCard", () => ({ default: ({ project }: { project: { name: string } }) => <p>카드:{project.name}</p> }));
vi.mock("./pulse/ProjectPulsePanel", () => ({ ProjectPulsePanel: ({ projectId }: { projectId: string }) => <p>현황:{projectId}</p> }));

import ProjectCarousel from "./ProjectCarousel";

afterEach(cleanup);
const projects = [{ id: "p1", name: "가 프로젝트" }, { id: "p2", name: "나 프로젝트" }, { id: "p3", name: "다 프로젝트" }] as never[];

describe("대시보드 상단 프로젝트 하나씩 보기", () => {
  it("헤더에서 고른 프로젝트부터 하나만 보여 주고, 좌 · 우로 바꾸며 끝에서 처음으로 돈다", () => {
    render(<ProjectCarousel projects={projects} onEdit={() => {}} onOverview={() => {}} />);
    expect(screen.getByText("카드:나 프로젝트")).toBeTruthy();
    expect(screen.getByText("현황:p2")).toBeTruthy();
    expect(screen.queryByText("카드:가 프로젝트")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다음 프로젝트" }));
    expect(screen.getByText("카드:다 프로젝트")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "다음 프로젝트" }));
    expect(screen.getByText("카드:가 프로젝트")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "이전 프로젝트" }));
    expect(screen.getByText("현황:p3")).toBeTruthy();
    expect(screen.getByText("3 / 3")).toBeTruthy();
  });

  it("영역에 포커스 후 ← → 로 바꾼다, 프로젝트가 하나면 버튼이 꺼진다", () => {
    ctx.selected = null;
    render(<ProjectCarousel projects={projects} onEdit={() => {}} onOverview={() => {}} />);
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(screen.getByText("카드:나 프로젝트")).toBeTruthy();
    cleanup();
    render(<ProjectCarousel projects={projects.slice(0, 1)} onEdit={() => {}} onOverview={() => {}} />);
    expect((screen.getByRole("button", { name: "다음 프로젝트" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
