/**
 * @file src/lib/llm/retry.test.ts
 * @description 429 재시도 동작을 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: Mistral 무료 요금제에서 채팅 2단계 호출이 429 로 바로 실패했다.
 */
import { describe, expect, it, vi } from "vitest";
import { isRateLimitError, withRateLimitRetry } from "./retry";

const noWait = () => Promise.resolve();
const err429 = Object.assign(new Error("API error occurred: Status 429"), { statusCode: 429 });

describe("isRateLimitError", () => {
  it.each([
    [{ statusCode: 429 }, true],
    [{ status: 429 }, true],
    [new Error("OpenAI API 오류 (429): Rate limit"), true],
    [new Error("Rate limit exceeded"), true],
    [new Error("OpenAI API 오류 (401): bad key"), false],
    [null, false],
  ])("%o → %s", (e, expected) => {
    expect(isRateLimitError(e)).toBe(expected);
  });
});

describe("withRateLimitRetry", () => {
  it("429 뒤 성공하면 결과를 돌려준다", async () => {
    const fn = vi.fn().mockRejectedValueOnce(err429).mockResolvedValueOnce("ok");
    const wait = vi.fn(noWait);
    await expect(withRateLimitRetry(fn, [10, 20], wait)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(10);
  });

  it("계속 429 면 재시도 횟수만큼 시도한 뒤 오류를 던진다", async () => {
    const fn = vi.fn().mockRejectedValue(err429);
    await expect(withRateLimitRetry(fn, [10, 20], noWait)).rejects.toBe(err429);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("429 가 아닌 오류는 재시도하지 않는다", async () => {
    const other = new Error("Invalid API key");
    const fn = vi.fn().mockRejectedValue(other);
    await expect(withRateLimitRetry(fn, [10, 20], noWait)).rejects.toBe(other);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
