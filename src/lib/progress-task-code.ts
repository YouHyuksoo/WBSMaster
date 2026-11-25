/**
 * @file src/lib/progress-task-code.ts
 * @description 진도 task 자동 번호(T-001)의 가장 큰 번호를 구합니다. 생성 API 와 엑셀 가져오기가 같이 씁니다.
 * 초보자 가이드: 개수나 순서로 세면 중간 번호를 지운 뒤 이미 있는 번호가 다시 나와 저장이 실패한다 → 코드에 든 숫자의 최댓값을 쓴다.
 */
export function lastProgressTaskNo(codes: Array<string | null>): number {
  return codes.reduce((max, code) => Math.max(max, Number(/^T-(\d+)$/.exec(code ?? "")?.[1] ?? 0)), 0);
}

export const progressTaskCode = (no: number) => `T-${String(no).padStart(3, "0")}`;
