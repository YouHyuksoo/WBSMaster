import { describe, it, expect } from 'vitest';

/**
 * 테스트 예제: 간단한 더하기 함수
 * 실제 프로젝트 로직을 테스트하기 전에 환경이 잘 잡혔는지 확인하는 용도입니다.
 */
function add(a: number, b: number) {
  return a + b;
}

describe('기본 테스트 환경 점검', () => {
  it('1 + 2는 3이어야 한다 (Vitest 동작 확인)', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('음수 더하기 테스트', () => {
    expect(add(-1, -2)).toBe(-3);
  });
});
