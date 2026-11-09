/**
 * @file src/components/common/HoverTooltip.test.tsx
 * @description HoverTooltip 이 표 상자 밖(document.body)에 고정 위치로 뜨고, 화면 안에 들어오는지 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: 표 칸 안에 absolute 로 그리던 툴팁이 overflow 표 상자에 잘려 필터 줄 뒤로 숨고, 폭이 작아 내용이 잘렸다.
 * - 이 저장소의 표는 HoverTooltip 만 쓴다 (예전 group-hover 툴팁 금지 검사 포함).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { HoverTooltip, computeTooltipPosition } from "./HoverTooltip";

describe("computeTooltipPosition", () => {
  const viewport = { width: 1400, height: 900 };

  it("위쪽 행은 아래로 연다", () => {
    const p = computeTooltipPosition({ left: 300, top: 120, bottom: 150 }, viewport);
    expect(p.placement).toBe("below");
    expect(p.top).toBe(158);
  });

  it("아래쪽 행은 위로 연다", () => {
    const p = computeTooltipPosition({ left: 300, top: 760, bottom: 790 }, viewport);
    expect(p.placement).toBe("above");
  });

  it("폭은 최대 560px, 오른쪽 끝 칸도 화면 안에 들어온다", () => {
    const p = computeTooltipPosition({ left: 1300, top: 400, bottom: 430 }, viewport);
    expect(p.width).toBe(560);
    expect(p.left + p.width).toBeLessThanOrEqual(viewport.width - 16);
  });

  it("좁은 화면은 화면 폭 - 32px", () => {
    expect(computeTooltipPosition({ left: 10, top: 100, bottom: 120 }, { width: 400, height: 800 }).width).toBe(368);
  });
});

describe("HoverTooltip", () => {
  it("마우스를 올리면 body 에 툴팁이 뜨고, 내리면 사라진다", () => {
    const { container } = render(
      createElement("div", { style: { overflow: "hidden" } },
        createElement(HoverTooltip, { label: "요구사항", content: "아주 긴 요구사항 내용", children: createElement("span", null, "요약") })
      )
    );
    fireEvent.mouseEnter(screen.getByText("요약").parentElement!);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toContain("아주 긴 요구사항 내용");
    expect(container.contains(tip)).toBe(false); // 표 상자(overflow) 밖에 렌더링
    expect(tip.className).toContain("fixed");
    fireEvent.mouseLeave(screen.getByText("요약").parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("enabled=false 면 띄우지 않는다", () => {
    render(createElement(HoverTooltip, { label: "설비명", content: "짧음", enabled: false, children: createElement("span", null, "짧음칸") }));
    fireEvent.mouseEnter(screen.getByText("짧음칸").parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("예전 칸 안 툴팁 금지", () => {
  it("src/app 에 absolute bottom-full + group-hover 툴팁이 없다", () => {
    const pattern = /absolute bottom-full[^"]*group-hover\//;
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (name.endsWith(".tsx")) out.push(full);
      }
      return out;
    };
    const hits = walk(join(process.cwd(), "src", "app"))
      .filter((f) => pattern.test(readFileSync(f, "utf8")))
      .map((f) => relative(process.cwd(), f));
    expect(hits).toEqual([]);
  });
});
