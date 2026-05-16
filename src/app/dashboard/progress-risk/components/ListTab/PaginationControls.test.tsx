import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls } from "./PaginationControls";

describe("PaginationControls", () => {
  it("처음/마지막 페이지 이동 버튼을 제공한다", () => {
    const onPageChange = vi.fn();

    render(
      <PaginationControls
        page={2}
        totalPages={5}
        startIndex={21}
        endIndex={40}
        totalItems={100}
        onPageChange={onPageChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "처음 페이지" }));
    fireEvent.click(screen.getByRole("button", { name: "마지막 페이지" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 5);
  });

  it("첫 페이지에서는 처음/이전 버튼을 비활성화한다", () => {
    render(
      <PaginationControls
        page={1}
        totalPages={5}
        startIndex={1}
        endIndex={20}
        totalItems={100}
        onPageChange={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "처음 페이지" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "이전 페이지" })).toHaveProperty("disabled", true);
  });

  it("마지막 페이지에서는 다음/마지막 버튼을 비활성화한다", () => {
    render(
      <PaginationControls
        page={5}
        totalPages={5}
        startIndex={81}
        endIndex={100}
        totalItems={100}
        onPageChange={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "다음 페이지" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "마지막 페이지" })).toHaveProperty("disabled", true);
  });
});
