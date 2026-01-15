/**
 * @file src/app/dashboard/kanban/components/nodeTypes.ts
 * @description
 * React Flow nodeTypes 정의 파일
 *
 * 🔑 왜 별도 파일로 분리했나?
 * React Flow는 nodeTypes 참조가 변경되면 경고를 발생시킵니다.
 * - 컴포넌트 내부에 정의하면 매 렌더링마다 새 객체 생성
 * - 같은 파일의 모듈 레벨에 정의해도 HMR 시 재생성됨
 * - 별도 파일로 분리하면 해당 파일이 변경되지 않는 한 참조가 유지됨
 *
 * @see https://reactflow.dev/error#002
 */

import { TaskNode } from "./TaskNode";

/**
 * 커스텀 노드 타입 정의
 * - task: 태스크 노드 (TaskNode 컴포넌트)
 */
export const nodeTypes = {
  task: TaskNode,
} as const;
