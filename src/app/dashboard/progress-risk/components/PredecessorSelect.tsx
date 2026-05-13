/**
 * @file src/app/dashboard/progress-risk/components/PredecessorSelect.tsx
 * @description 선행 task 드롭다운 — 자기 자신과 순환 의존성 task는 제외
 *
 * 초보자 가이드:
 * 1. **순환 의존성 방지**: getInvalidPredecessors는 시작 task부터 역으로 추적
 *    - 자기 자신은 항상 제외
 *    - 자신을 (간접적으로) 선행으로 둔 task도 제외
 * 2. **드롭다운**: 선택 가능한 task는 candidates (invalid 제외)
 * 3. **onChange**: 선행 ID 변경 시 부모 mutation 호출
 */
"use client";
import type { ProgressTask } from "@/lib/api";

interface Props {
  value: string | null;
  taskId: string;
  allTasks: ProgressTask[];
  onChange: (predecessorId: string | null) => void;
}

/**
 * 순환 의존성 방지: 자기 자신과 자신을 (간접적으로) 선행으로 둔 task들을 제외
 *
 * 예: A → B → C 인 상태에서 C의 선행 후보에는 A, B는 OK지만,
 *     C 자신, 그리고 C를 선행으로 둔 task(있다면)는 제외해야 함.
 *
 * 알고리즘:
 *   - 시작 집합 = { taskId }
 *   - 반복: 누군가의 predecessorId가 집합에 있으면 그것도 추가
 *   - 변화 없을 때까지 반복
 */
function getInvalidPredecessors(taskId: string, allTasks: ProgressTask[]): Set<string> {
  const invalid = new Set<string>([taskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of allTasks) {
      if (!invalid.has(t.id) && t.predecessorId && invalid.has(t.predecessorId)) {
        invalid.add(t.id);
        changed = true;
      }
    }
  }
  return invalid;
}

export function PredecessorSelect({ value, taskId, allTasks, onChange }: Props) {
  const invalid = getInvalidPredecessors(taskId, allTasks);
  const candidates = allTasks.filter(t => !invalid.has(t.id));

  return (
    <select
      value={value ?? ""}
      onChange={e => onChange(e.target.value || null)}
      className="bg-transparent border-0 focus:outline-none focus:bg-white/5 dark:focus:bg-white/5 text-xs text-text-secondary cursor-pointer rounded px-1"
      aria-label="선행 task 선택"
    >
      <option value="">-</option>
      {candidates.map(t => (
        <option key={t.id} value={t.id}>{t.code}</option>
      ))}
    </select>
  );
}
