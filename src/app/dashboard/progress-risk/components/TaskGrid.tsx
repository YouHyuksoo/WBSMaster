/**
 * @file src/app/dashboard/progress-risk/components/TaskGrid.tsx
 * @description task 그리드 — 헤더 + 행 목록
 *
 * 초보자 가이드:
 * 1. **COLS**: 그리드 컬럼 폭 정의 (TaskRow와 공유)
 * 2. **헤더**: 고정 헤더 행 (배경색 dark:bg-background-dark)
 * 3. **TaskRow**: 각 task를 개별 행으로 렌더 + highlight 지원
 */
import type { ProgressTask } from "@/lib/api";
import { TaskRow } from "./TaskRow";

interface Props {
  tasks: ProgressTask[];
  projectId: string;
  highlightTaskId?: string | null;
}

const COLS = "46px 70px 70px 110px 1fr 80px 80px 460px 90px 1fr 80px 30px";

/** 대분류 자동완성 옵션 — TaskRow의 input list 속성과 매칭 */
const CATEGORY_OPTIONS = ["자재관리", "생산관리", "품질관리", "공정관리", "설비관리", "기준관리", "출하관리", "재고관리"];

export function TaskGrid({ tasks, projectId, highlightTaskId }: Props) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      <datalist id="progress-task-category-options">
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {/* 헤더 행 */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1700px]"
        style={{ gridTemplateColumns: COLS }}
      >
        <div>#</div>
        <div>코드</div>
        <div>사업부</div>
        <div>대분류</div>
        <div>기능명</div>
        <div>시작</div>
        <div>종료</div>
        <div>단계</div>
        <div>선행</div>
        <div>담당자</div>
        <div>상태</div>
        <div></div>
      </div>

      {/* task 목록 */}
      {tasks.map((task, idx) => (
        <TaskRow
          key={task.id}
          index={idx + 1}
          task={task}
          projectId={projectId}
          allTasks={tasks}
          gridCols={COLS}
          highlighted={highlightTaskId === task.id}
        />
      ))}
    </div>
  );
}
