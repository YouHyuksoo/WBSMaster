/**
 * @file src/lib/to-be/to-be-service.test.ts
 * @description TO-BE 설계 서버 규칙(관리번호 · 입력 검사 · 초안 만들기 중복 방지 · AS-IS · WBS 연결 범위)을 가짜 prisma 로 검증합니다.
 * 초보자 가이드:
 * - 실제 DB 에 쓰지 않는다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toBeOverview: { upsert: vi.fn() },
  toBeItem: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  toBeAsIsLink: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  toBeWbsLink: { deleteMany: vi.fn(), createMany: vi.fn() },
  asIsOverviewItem: { findMany: vi.fn(), count: vi.fn() },
  wbsItem: { count: vi.fn() },
  $transaction: vi.fn(async (arg: unknown) => (typeof arg === "function" ? arg(db) : arg)),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { createToBeItem, draftFromAsIs, nextManagementNo, parseToBeInput, updateToBeItem } from "./to-be-service";

beforeEach(() => {
  vi.clearAllMocks();
  db.toBeOverview.upsert.mockResolvedValue({ id: "ov1" });
});

describe("TO-BE 관리번호", () => {
  it("가장 큰 번호 다음을 3자리로 붙인다 (형식이 다른 값은 무시)", () => {
    expect(nextManagementNo([])).toBe("TB-001");
    expect(nextManagementNo(["TB-001", "TB-012", "X-99"])).toBe("TB-013");
  });
});

describe("입력 검사", () => {
  it("필수 칸 · 열거값 · SFR 형식을 검사하고 SFR 은 대문자 · 중복 제거", () => {
    expect(() => parseToBeInput({ majorCategory: "PRODUCTION", middleCategory: "", taskName: "x" }, false)).toThrow(/중분류/);
    expect(() => parseToBeInput({ majorCategory: "NOPE", middleCategory: "a", taskName: "b" }, false)).toThrow(/대분류/);
    expect(() => parseToBeInput({ changeType: "MAYBE" }, true)).toThrow(/변화 유형/);
    expect(() => parseToBeInput({ sfrCodes: ["SFR-12"] }, true)).toThrow(/SFR/);
    expect(parseToBeInput({ sfrCodes: ["sfr-012", "SFR-012", " SFR-001 "] }, true)).toEqual({ sfrCodes: ["SFR-012", "SFR-001"] });
    expect(parseToBeInput({ priority: "" }, true)).toEqual({ priority: null });
  });

  it("다른 프로젝트 AS-IS 업무는 연결할 수 없다", async () => {
    db.asIsOverviewItem.count.mockResolvedValueOnce(1);
    await expect(createToBeItem("p1", { majorCategory: "PRODUCTION", middleCategory: "a", taskName: "b", asIsItemIds: ["x", "y"] }))
      .rejects.toMatchObject({ status: 400 });
    expect(db.toBeItem.create).not.toHaveBeenCalled();
  });
});

describe("WBS 연결 (3단계)", () => {
  const saved = { asIsLinks: [], wbsLinks: [{ wbsItem: { id: "w2", code: "3.10" } }, { wbsItem: { id: "w1", code: "3.2" } }] };

  it("다른 프로젝트 WBS 작업은 연결할 수 없다", async () => {
    db.wbsItem.count.mockResolvedValueOnce(1);
    await expect(updateToBeItem("t1", "p1", { wbsItemIds: ["w1", "w9"] })).rejects.toMatchObject({ status: 400 });
    expect(db.toBeWbsLink.deleteMany).not.toHaveBeenCalled();
  });

  it("wbsItemIds 를 보내지 않은 수정은 WBS 연결을 그대로 둔다 (개요만 저장해도 연결이 지워지지 않음)", async () => {
    db.toBeItem.update.mockResolvedValueOnce(saved);
    await updateToBeItem("t1", "p1", { summary: "요약만" });
    expect(db.toBeWbsLink.deleteMany).not.toHaveBeenCalled();
    expect(db.wbsItem.count).not.toHaveBeenCalled();
  });

  it("보낸 목록으로 통째로 바꾸고, 응답의 WBS 는 코드 자연 순서(3.2 < 3.10)", async () => {
    db.wbsItem.count.mockResolvedValueOnce(2);
    db.toBeItem.update.mockResolvedValueOnce(saved);
    const item = await updateToBeItem("t1", "p1", { wbsItemIds: ["w1", "w2", "w1"] });
    expect(db.toBeWbsLink.deleteMany).toHaveBeenCalledWith({ where: { toBeItemId: "t1" } });
    expect(db.toBeWbsLink.createMany).toHaveBeenCalledWith({ data: [{ toBeItemId: "t1", wbsItemId: "w1" }, { toBeItemId: "t1", wbsItemId: "w2" }] });
    expect(item.wbsItems.map((w) => w.code)).toEqual(["3.2", "3.10"]);
  });
});

describe("AS-IS 에서 초안 만들기", () => {
  it("이미 연결된 AS-IS 는 건너뛰고 나머지만 다음 번호로 1:1 복사한다", async () => {
    db.asIsOverviewItem.findMany.mockResolvedValueOnce([
      { id: "a1", majorCategory: "MASTER", middleCategory: "기준", taskName: "품목", currentMethod: "SYSTEM" },
      { id: "a2", majorCategory: "PRODUCTION", middleCategory: "실적", taskName: "실적 등록", currentMethod: "MANUAL" },
    ]);
    db.toBeAsIsLink.findMany.mockResolvedValueOnce([{ asIsItemId: "a1" }]);
    db.toBeItem.findMany.mockResolvedValueOnce([{ toBeManagementNo: "TB-001", order: 10 }]);
    expect(await draftFromAsIs("p1")).toEqual({ created: 1, skipped: 1 });
    const data = db.toBeItem.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ toBeManagementNo: "TB-002", taskName: "실적 등록", changeType: "IMPROVE", status: "DRAFT", order: 20 });
    expect(data.asIsLinks).toEqual({ create: [{ asIsItemId: "a2" }] });
  });
});
