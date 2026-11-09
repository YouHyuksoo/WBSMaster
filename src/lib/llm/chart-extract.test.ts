/**
 * @file src/lib/llm/chart-extract.test.ts
 * @description
 * LLM 답에서 차트·마인드맵 태그를 꺼내는 extractChartAndMindmap 의 기존 동작을 고정합니다.
 * (예전 분석 파이프라인과 새 에이전트 루프가 같이 쓴다)
 *
 * 초보자 가이드:
 * - [CHART:bar] [CHART_DATA:{"labels":[...],"values":[...]}] → chartType "bar", chartData [{name, value}]
 * - [MINDMAP_DATA:{중첩 JSON}] → mindmapData, 태그는 본문에서 지운다
 */

import { describe, expect, it } from "vitest";
import { extractChartAndMindmap } from "./index";

describe("extractChartAndMindmap", () => {
  it("parses bar chart tags and strips them", () => {
    const r = extractChartAndMindmap(
      '상태별 건수입니다.\n[CHART:bar_3d]\n[CHART_DATA:{"labels":["OPEN","CLOSED"],"values":[6,3]}]',
      null,
      "이슈 상태별 건수"
    );
    expect(r.chartType).toBe("bar");
    expect(r.chartData).toEqual([{ name: "OPEN", value: 6 }, { name: "CLOSED", value: 3 }]);
    expect(r.content).toBe("상태별 건수입니다.");
  });

  it("parses nested mindmap json", () => {
    const r = extractChartAndMindmap(
      'WBS 구조\n[CHART:mindmap] [MINDMAP_DATA:{"name":"오창","children":[{"name":"분석","children":[{"name":"요구"}]}]}]',
      null,
      "WBS 마인드맵"
    );
    expect(r.chartType).toBe("mindmap");
    expect(r.mindmapData?.children?.[0].children?.[0].name).toBe("요구");
    expect(r.content).toBe("WBS 구조");
  });

  it("no tags → plain content", () => {
    const r = extractChartAndMindmap("안녕하세요", null, "안녕");
    expect(r).toMatchObject({ content: "안녕하세요", chartType: null });
  });
});
