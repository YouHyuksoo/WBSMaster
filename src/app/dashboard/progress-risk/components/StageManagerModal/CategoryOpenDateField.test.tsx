import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryOpenDateField } from "./CategoryOpenDateField";

describe("CategoryOpenDateField", () => {
  it("날짜 선택 시 로컬 값만 먼저 변경하고 blur 때 저장한다", () => {
    const onSave = vi.fn();

    render(
      <CategoryOpenDateField
        value=""
        disabled={false}
        onSave={onSave}
      />
    );

    const input = screen.getByLabelText("최종 오픈일자");
    fireEvent.change(input, { target: { value: "2026-06-30" } });

    expect(input).toHaveProperty("value", "2026-06-30");
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith("2026-06-30");
  });
});
