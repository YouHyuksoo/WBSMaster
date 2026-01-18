/**
 * @file src/app/dashboard/as-is-analysis/types.ts
 * @description
 * AS-IS 현행 분석 시스템의 타입 정의 파일입니다.
 *
 * 초보자 가이드:
 * 1. **AsIsOverview**: 프로젝트별 총괄 정보 (고객사명, 작성자, 작성일)
 * 2. **AsIsOverviewItem**: 업무 분류 체계 항목 (대분류 > 중분류 > 업무명)
 * 3. **AsIsUnitAnalysis**: 단위업무 상세 분석 (Flow Chart, Swimlane 포함)
 * 4. **각 섹션 타입들**: 프로세스 정의서, R&R, 인터뷰, 이슈 등
 */

import { Node, Edge } from "reactflow";

// ============================================
// 기본 Enum 타입
// ============================================

/** 대분류 카테고리 */
export type AsIsMajorCategory =
  | "MATERIAL"      // 자재관리
  | "PRODUCTION"    // 생산관리
  | "QUALITY"       // 품질관리
  | "EQUIPMENT"     // 설비관리
  | "INVENTORY"     // 재고관리
  | "SHIPMENT"      // 출하관리
  | "OTHER";        // 기타

/** 현행 방식 */
export type AsIsCurrentMethod =
  | "MANUAL"    // 수기
  | "EXCEL"     // 엑셀
  | "SYSTEM"    // 시스템
  | "MIXED";    // 혼합

/** 이슈 타입 */
export type AsIsIssueType =
  | "PAIN_POINT"    // Pain Point
  | "BOTTLENECK"    // 병목현상
  | "GAP"           // Gap
  | "OTHER";        // 기타

/** 우선순위 */
export type Priority = "HIGH" | "MEDIUM" | "LOW";

// ============================================
// 총괄 관련 타입
// ============================================

/** AS-IS 총괄 */
export interface AsIsOverview {
  id: string;
  businessUnit: string; // 사업부 구분 (V_IVI, V_DISP, V_PCBA, V_HMS)
  customerName?: string | null;
  author?: string | null;
  createdDate: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
  items?: AsIsOverviewItem[];
}

/** AS-IS 총괄 항목 */
export interface AsIsOverviewItem {
  id: string;
  majorCategory: AsIsMajorCategory;
  middleCategory: string;
  taskName: string;
  currentMethod: AsIsCurrentMethod;
  issueSummary?: string | null;
  details?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  overviewId: string;
  unitAnalysis?: AsIsUnitAnalysis | null;
}

// ============================================
// 단위업무 분석 관련 타입
// ============================================

/** Flow Chart 노드/엣지 데이터 */
export interface FlowChartData {
  nodes: Node[];
  edges: Edge[];
}

/** Swimlane 노드/엣지 데이터 */
export interface SwimlaneData {
  nodes: Node[];
  edges: Edge[];
  lanes: SwimlaneHeader[];
}

/** Swimlane 헤더 (레인 정보) */
export interface SwimlaneHeader {
  id: string;
  name: string;
  order: number;
  color?: string;
}

/** AS-IS 단위업무 분석 */
export interface AsIsUnitAnalysis {
  id: string;
  flowChartData?: FlowChartData | null;
  swimlaneData?: SwimlaneData | null;
  createdAt: string;
  updatedAt: string;
  overviewItemId: string;
  overviewItem?: AsIsOverviewItem;

  // 하위 테이블들
  processDefinitions?: AsIsProcessDefinition[];
  flowChartDetails?: AsIsFlowChartDetail[];
  responsibilities?: AsIsResponsibility[];
  interviews?: AsIsInterview[];
  issues?: AsIsIssue[];

  // 조건부 섹션 (A: 수기/엑셀용)
  documents?: AsIsDocument[];
  documentAnalyses?: AsIsDocumentAnalysis[];

  // 조건부 섹션 (B: 시스템용)
  functions?: AsIsFunction[];
  screens?: AsIsScreen[];
  interfaces?: AsIsInterface[];
  dataModels?: AsIsDataModel[];
  codeDefinitions?: AsIsCodeDefinition[];
}

// ============================================
// 공통 섹션 타입
// ============================================

/** 업무 프로세스 정의서 */
export interface AsIsProcessDefinition {
  id: string;
  stepNumber: number;
  processName: string;
  description?: string | null;
  input?: string | null;
  output?: string | null;
  relatedSystem?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** Flow Chart 상세 */
export interface AsIsFlowChartDetail {
  id: string;
  nodeId?: string | null;
  stepNumber: number;
  processName: string;
  description?: string | null;
  responsible?: string | null;
  systemUsed?: string | null;
  inputData?: string | null;
  outputData?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** R&R 정의 */
export interface AsIsResponsibility {
  id: string;
  role: string;
  department?: string | null;
  responsibility: string;
  authority?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 현업 인터뷰 결과 */
export interface AsIsInterview {
  id: string;
  interviewee: string;
  department?: string | null;
  position?: string | null;
  interviewDate?: string | null;
  topic?: string | null;
  content: string;
  keyFindings?: string | null;
  suggestions?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 이슈/Pain Point */
export interface AsIsIssue {
  id: string;
  issueType: AsIsIssueType;
  title: string;
  description?: string | null;
  impact?: string | null;
  frequency?: string | null;
  priority?: Priority | null;
  suggestedFix?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

// ============================================
// 조건부 섹션 A (수기/엑셀용) 타입
// ============================================

/** 문서 목록 */
export interface AsIsDocument {
  id: string;
  documentName: string;
  documentType?: string | null;
  purpose?: string | null;
  creator?: string | null;
  frequency?: string | null;
  storageLocation?: string | null;
  retentionPeriod?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 문서 구조 분석 */
export interface AsIsDocumentAnalysis {
  id: string;
  documentName: string;
  fieldName: string;
  dataType?: string | null;
  sampleData?: string | null;
  isMandatory: boolean;
  validationRule?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

// ============================================
// 조건부 섹션 B (시스템용) 타입
// ============================================

/** 기능 목록 */
export interface AsIsFunction {
  id: string;
  functionId?: string | null;
  functionName: string;
  description?: string | null;
  module?: string | null;
  usageFrequency?: string | null;
  userCount?: string | null;
  importance?: Priority | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 화면 목록 */
export interface AsIsScreen {
  id: string;
  screenId?: string | null;
  screenName: string;
  description?: string | null;
  menuPath?: string | null;
  screenType?: string | null;
  relatedFunction?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 인터페이스 목록 */
export interface AsIsInterface {
  id: string;
  interfaceId?: string | null;
  interfaceName: string;
  description?: string | null;
  sourceSystem?: string | null;
  targetSystem?: string | null;
  interfaceType?: string | null;
  protocol?: string | null;
  frequency?: string | null;
  dataVolume?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 데이터 모델 */
export interface AsIsDataModel {
  id: string;
  tableName: string;
  tableNameKr?: string | null;
  description?: string | null;
  columnName?: string | null;
  columnNameKr?: string | null;
  dataType?: string | null;
  length?: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  defaultValue?: string | null;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

/** 코드 정의서 */
export interface AsIsCodeDefinition {
  id: string;
  codeGroup: string;
  codeGroupName?: string | null;
  codeValue: string;
  codeName: string;
  description?: string | null;
  isActive: boolean;
  remarks?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  unitAnalysisId: string;
}

// ============================================
// React Flow 커스텀 노드 타입
// ============================================

/** 프로세스 노드 데이터 */
export interface ProcessNodeData {
  label: string;
  description?: string;
  responsible?: string;
  systemUsed?: string;
}

/** 판단 노드 데이터 */
export interface DecisionNodeData {
  label: string;
  condition?: string;
}

/** 시작/종료 노드 데이터 */
export interface StartEndNodeData {
  label: string;
  type: "start" | "end";
}

/** 문서 노드 데이터 */
export interface DocumentNodeData {
  label: string;
  documentName?: string;
}

/** Swimlane 프로세스 노드 데이터 */
export interface SwimlaneProcessNodeData {
  label: string;
  laneId: string;
  description?: string;
}

// ============================================
// API 요청/응답 타입
// ============================================

/** 총괄 생성 요청 */
export interface CreateAsIsOverviewRequest {
  projectId: string;
  businessUnit: string; // 사업부 구분 (V_IVI, V_DISP, V_PCBA, V_HMS)
  customerName?: string;
  author?: string;
}

/** 총괄 항목 생성 요청 */
export interface CreateAsIsOverviewItemRequest {
  overviewId: string;
  majorCategory: AsIsMajorCategory;
  middleCategory: string;
  taskName: string;
  currentMethod?: AsIsCurrentMethod;
  issueSummary?: string;
  details?: string;
  remarks?: string;
}

/** 단위업무 분석 생성 요청 */
export interface CreateAsIsUnitAnalysisRequest {
  overviewItemId: string;
}

/** Flow Chart 저장 요청 */
export interface SaveFlowChartRequest {
  flowChartData: FlowChartData;
}

/** Swimlane 저장 요청 */
export interface SaveSwimlaneRequest {
  swimlaneData: SwimlaneData;
}
