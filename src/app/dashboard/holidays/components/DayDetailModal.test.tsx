/**
 * @file src/app/dashboard/holidays/components/DayDetailModal.test.tsx
 * @description 날짜 칸 클릭 → 그날 일정 상세 모달 동작을 가상 데이터로 검증합니다.
 * 초보자 가이드:
 * - 날짜 칸 빈 공간 클릭은 상세, 일정 막대 클릭은 기존처럼 수정으로 간다.
 * - 상세 모달은 설명 전체 · 기간(며칠째) · 시간을 줄이지 않고 보여 준다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Holiday } from "@/lib/api";
import { DayDetailModal, periodLabel, sortDayHolidays } from "./DayDetailModal";
import { MonthlyCalendar } from "./MonthlyCalendar";

afterEach(cleanup);

function holiday(over: Partial<Holiday>): Holiday {
  return {
    id: "h1", title: "현업 인터뷰", type: "MEETING", isAllDay: true,
    date: "2026-11-10T00:00:00.000Z", createdAt: "2026-11-01", updatedAt: "2026-11-01", ...over,
  };
}

describe("그날 일정 상세 모달", () => {
  it("설명 전체와 시간 · 담당자를 보여 주고 수정 · 삭제 · 이 날 등록을 연결한다", () => {
    const long = "1줄 설명\n2줄 설명 — 끝까지 잘리지 않아야 한다";
    const item = holiday({ isAllDay: false, startTime: "10:00", endTime: "11:30", description: long,
      user: { id: "u1", email: "a@b.c", name: "김산" } });
    const onEdit = vi.fn(); const onDelete = vi.fn(); const onAdd = vi.fn();
    render(<DayDetailModal date={new Date(2026, 10, 10)} holidays={[item]} onClose={() => {}}
      onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />);
    expect(screen.getByText("2026년 11월 10일 (화) · 일정 1건")).toBeTruthy();
    expect(screen.getByText("10:00 ~ 11:30")).toBeTruthy();
    expect(screen.getByText("김산")).toBeTruthy();
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === long)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "현업 인터뷰 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "현업 인터뷰 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: /이 날 일정 등록/ }));
    expect(onEdit).toHaveBeenCalledWith(item);
    expect(onDelete).toHaveBeenCalledWith("h1");
    expect(onAdd).toHaveBeenCalledWith("2026-11-10");
  });

  it("일정이 없으면 빈 안내를 보여 준다", () => {
    render(<DayDetailModal date={new Date(2026, 10, 11)} holidays={[]} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("이 날 등록된 일정이 없습니다.")).toBeTruthy();
  });

  it("여러 날 일정은 며칠째인지, 정렬은 종일 먼저 · 시작 시간 순", () => {
    const multi = holiday({ date: "2026-11-09T00:00:00", endDate: "2026-11-13T00:00:00" });
    expect(periodLabel(multi, new Date(2026, 10, 10))).toBe("11월 9일 (월) ~ 11월 13일 (금) · 5일 중 2일째");
    expect(periodLabel(holiday({}), new Date(2026, 10, 10))).toBeNull();
    const sorted = sortDayHolidays([
      holiday({ id: "b", title: "오후", isAllDay: false, startTime: "14:00" }),
      holiday({ id: "a", title: "오전", isAllDay: false, startTime: "09:00" }),
      holiday({ id: "c", title: "종일", isAllDay: true }),
    ]);
    expect(sorted.map((h) => h.id)).toEqual(["c", "a", "b"]);
  });
});

describe("월간 달력 날짜 칸 클릭", () => {
  it("빈 공간 클릭은 상세(onDayClick), 일정 막대 클릭은 수정(onHolidayClick)만 부른다", () => {
    const item = holiday({});
    const onDayClick = vi.fn(); const onHolidayClick = vi.fn();
    render(<MonthlyCalendar year={2026} month={10} onDayClick={onDayClick} onHolidayClick={onHolidayClick}
      getHolidaysForDate={(d) => (d === 10 ? [item] : [])} />);
    fireEvent.click(screen.getByText("현업 인터뷰"));
    expect(onHolidayClick).toHaveBeenCalledWith(item);
    expect(onDayClick).not.toHaveBeenCalled();
    const cell = screen.getByRole("button", { name: "11월 10일 일정 1건 크게 보기" });
    fireEvent.click(cell);
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(onDayClick).toHaveBeenCalledTimes(2);
    expect((onDayClick.mock.calls[0][0] as Date).getDate()).toBe(10);
  });
});
