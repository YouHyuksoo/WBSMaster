import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("새로고침 버튼을 렌더링하고 클릭 시 콜백을 호출한다", () => {
    const onRefresh = vi.fn();

    render(<PageHeader taskCount={3} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: /새로고침/ }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("새로고침 중이면 처리 상태를 표시한다", () => {
    render(<PageHeader taskCount={3} onRefresh={() => undefined} isRefreshing />);

    expect(screen.getByRole("button", { name: /새로고침 중/ })).toHaveProperty("disabled", true);
  });
});
