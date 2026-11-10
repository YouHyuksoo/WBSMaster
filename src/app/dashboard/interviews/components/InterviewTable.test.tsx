/**
 * @file src/app/dashboard/interviews/components/InterviewTable.test.tsx
 * @description 인터뷰 편집 연결·이관 잠금·전체 결과 검색을 가상 데이터로 검사합니다.
 * 초보자 가이드:
 * - 콜백은 목 함수이며 실제 저장 API를 호출하지 않습니다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterviewTable } from "./InterviewTable";
import type { Interview } from "../types";
afterEach(cleanup);

function interview(index: number, transferred = false): Interview {
  return { id: `interview-${index}`, sequence: index, code: `IV-${index}`, title: `인터뷰 ${index}`,
    interviewDate: "2026-11-10", interviewer: "진행자", interviewee: "대상자", category: "생산",
    currentProcess: `현재 운영 방식 ${index}`, painPoints: "문제점", desiredResults: "원하는결과",
    transferStatus: transferred ? "TRANSFERRED" : "NOT_TRANSFERRED", createdAt: "2026-11-10", updatedAt: "2026-11-10", projectId: "fixture" };
}

describe("인터뷰 jisung-ui 전환", () => {
  it("수정·삭제와 세 가지 이관 대상을 원본 인터뷰로 연결한다", () => {
    const row = interview(1);
    const actions = { onEdit: vi.fn(), onDelete: vi.fn(), onTransfer: vi.fn() };
    render(<InterviewTable interviews={[row]} {...actions} />);
    fireEvent.click(screen.getByRole("button", { name: "IV-1 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "IV-1 삭제" }));
    for (const value of ["CUSTOMER_REQUIREMENT", "FIELD_ISSUE", "DISCUSSION_ITEM"]) {
      fireEvent.change(screen.getByRole("combobox", { name: "IV-1 이관" }), { target: { value } });
      expect(actions.onTransfer).toHaveBeenCalledWith(row, value);
    }
    expect(actions.onEdit).toHaveBeenCalledWith(row);
    expect(actions.onDelete).toHaveBeenCalledWith(row);
  });
  it("이관완료 행의 재이관을 막는다", () => {
    render(<InterviewTable interviews={[interview(1, true)]} onEdit={vi.fn()} onDelete={vi.fn()} onTransfer={vi.fn()} />);
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "IV-1 이관" }).disabled).toBe(true);
  });
  it("다른 페이지의 인터뷰도 전체 결과에서 검색한다", () => {
    render(<InterviewTable interviews={Array.from({ length: 25 }, (_, i) => interview(i + 1))} onEdit={vi.fn()} onDelete={vi.fn()} onTransfer={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "IV-25 수정" })).toBeNull();
    fireEvent.click(screen.getByTitle("그리드 옵션"));
    fireEvent.click(screen.getByText("컬럼 필터"));
    fireEvent.change(screen.getByPlaceholderText("제목 검색"), { target: { value: "인터뷰 25" } });
    expect(screen.getByRole("button", { name: "IV-25 수정" })).toBeTruthy();
  });
});
