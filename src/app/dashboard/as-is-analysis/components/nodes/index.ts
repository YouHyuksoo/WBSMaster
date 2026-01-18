/**
 * @file src/app/dashboard/as-is-analysis/components/nodes/index.ts
 * @description
 * ReactFlow 커스텀 노드 export 파일입니다.
 *
 * 초보자 가이드:
 * 1. **flowChartNodeTypes**: Flow Chart에서 사용하는 노드 타입
 * 2. **swimlaneNodeTypes**: Swimlane에서 사용하는 노드 타입
 */

export { ProcessNode } from "./ProcessNode";
export { DecisionNode } from "./DecisionNode";
export { StartEndNode } from "./StartEndNode";
export { DocumentNode } from "./DocumentNode";
export { DataNode } from "./DataNode";
export { InterfaceNode } from "./InterfaceNode";
export { DatabaseNode } from "./DatabaseNode";
export { SubProcessNode } from "./SubProcessNode";
export { ManualInputNode } from "./ManualInputNode";
export { SwimlaneProcessNode } from "./SwimlaneProcessNode";

import { ProcessNode } from "./ProcessNode";
import { DecisionNode } from "./DecisionNode";
import { StartEndNode } from "./StartEndNode";
import { DocumentNode } from "./DocumentNode";
import { DataNode } from "./DataNode";
import { InterfaceNode } from "./InterfaceNode";
import { DatabaseNode } from "./DatabaseNode";
import { SubProcessNode } from "./SubProcessNode";
import { ManualInputNode } from "./ManualInputNode";
import { SwimlaneProcessNode } from "./SwimlaneProcessNode";

/**
 * Flow Chart용 노드 타입 정의
 */
export const flowChartNodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  startEnd: StartEndNode,
  document: DocumentNode,
  data: DataNode,
  interface: InterfaceNode,
  database: DatabaseNode,
  subProcess: SubProcessNode,
  manualInput: ManualInputNode,
};

/**
 * Swimlane용 노드 타입 정의
 */
export const swimlaneNodeTypes = {
  swimlaneProcess: SwimlaneProcessNode,
  startEnd: StartEndNode,
  decision: DecisionNode,
};
