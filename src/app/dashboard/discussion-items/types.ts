/**
 * @file src/app/dashboard/discussion-items/types.ts
 * @description
 * 협의요청관리 페이지 타입 정의입니다.
 *
 * 초보자 가이드:
 * - DiscussionItem: 협의요청 데이터 타입
 * - STATUS_CONFIG: 상태별 아이콘, 색상 설정
 * - STAGE_CONFIG: 발생 단계별 설정
 * - PRIORITY_CONFIG: 우선순위별 설정
 */

/**
 * 협의요청 상태 타입
 */
export type DiscussionStatus =
  | "DISCUSSING"                 // 협의 중
  | "CONVERTED_TO_REQUEST"       // 고객요청으로 변환
  | "CONVERTED_TO_COOPERATION"   // 업무협조로 변환
  | "BLOCKED"                    // 보류/지연
  | "COMPLETED";                 // 종료 (결정완료)

/**
 * 발생 단계 타입
 */
export type DiscussionStage =
  | "ANALYSIS"        // 분석
  | "DESIGN"          // 설계
  | "IMPLEMENTATION"  // 구현
  | "TESTING"         // 테스트
  | "OPERATION";      // 운영

/**
 * 우선순위 타입
 */
export type DiscussionPriority =
  | "HIGH"    // 높음 (긴급)
  | "MEDIUM"  // 보통
  | "LOW";    // 낮음

/**
 * 변환 타입
 */
export type DiscussionConvertType =
  | "CUSTOMER_REQUEST"  // 고객요청 (REQ-XXXX)
  | "COOPERATION"       // 업무협조 (COOP-XXXX)
  | "BLOCKED"           // 보류
  | "COMPLETED";        // 종료

/**
 * 협의 선택지 타입
 */
export interface DiscussionOption {
  label: string;        // 선택지 레이블 (A안, B안 등)
  description: string;  // 선택지 설명
  cost?: number;        // 예상 비용 (선택)
  duration?: number;    // 예상 소요 기간 (일 단위, 선택)
}

/**
 * 협의요청 데이터 타입
 */
export interface DiscussionItem {
  id: string;
  code: string;                      // 협의요청 코드 (DIS-0001)
  businessUnit: string;              // 사업부구분
  title: string;                     // 협의 주제
  description: string | null;        // 상세 내용
  status: DiscussionStatus;          // 상태
  stage: DiscussionStage;            // 발생 단계
  priority: DiscussionPriority;      // 우선순위

  options: DiscussionOption[] | null;  // 선택지 배열
  decision: string | null;             // 최종 결정 내용

  convertedToType: DiscussionConvertType | null;  // 변환 유형
  convertedToCode: string | null;                 // 변환된 항목 코드
  referenceNote: string | null;                   // 참고사항

  requesterName: string | null;  // 요청자명 (이관 시 원본 이슈어 등)

  reportDate: string;           // 보고일
  dueDate: string | null;       // 협의 기한
  resolvedDate: string | null;  // 결정 완료일

  createdAt: string;
  updatedAt: string;

  projectId: string;
  project?: {
    id: string;
    name: string;
  };

  reporterId: string | null;
  reporter?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;

  assigneeId: string | null;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
}

/**
 * 폼 데이터 타입 (등록/수정용)
 */
export interface DiscussionItemFormData {
  businessUnit: string;
  title: string;
  description?: string;
  stage: DiscussionStage;
  priority?: DiscussionPriority;
  options: DiscussionOption[];
  requesterName?: string;
  reporterId?: string;
  assigneeId?: string;
  dueDate?: string;
}

/**
 * 상태 설정 (아이콘, 색상 포함)
 */
export const STATUS_CONFIG: Record<DiscussionStatus, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  DISCUSSING: {
    label: "협의 중",
    icon: "forum",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  CONVERTED_TO_REQUEST: {
    label: "고객요청 변환",
    icon: "transition_slide",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  CONVERTED_TO_COOPERATION: {
    label: "업무협조 변환",
    icon: "swap_horiz",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  BLOCKED: {
    label: "보류",
    icon: "block",
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  },
  COMPLETED: {
    label: "완료",
    icon: "check_circle",
    color: "text-success",
    bgColor: "bg-success/10",
  },
};

/**
 * 발생 단계 설정
 */
export const STAGE_CONFIG: Record<DiscussionStage, {
  label: string;
  icon: string;
  color: string;
}> = {
  ANALYSIS: {
    label: "분석",
    icon: "search",
    color: "text-purple-500",
  },
  DESIGN: {
    label: "설계",
    icon: "architecture",
    color: "text-indigo-500",
  },
  IMPLEMENTATION: {
    label: "구현",
    icon: "code",
    color: "text-blue-500",
  },
  TESTING: {
    label: "테스트",
    icon: "bug_report",
    color: "text-orange-500",
  },
  OPERATION: {
    label: "운영",
    icon: "settings",
    color: "text-green-500",
  },
};

/**
 * 우선순위 설정
 */
export const PRIORITY_CONFIG: Record<DiscussionPriority, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  HIGH: {
    label: "높음",
    icon: "priority_high",
    color: "text-error",
    bgColor: "bg-error/10",
  },
  MEDIUM: {
    label: "보통",
    icon: "remove",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  LOW: {
    label: "낮음",
    icon: "low_priority",
    color: "text-text-secondary",
    bgColor: "bg-surface dark:bg-surface-dark",
  },
};

/**
 * 변환 타입 설정
 */
export const CONVERT_TYPE_CONFIG: Record<DiscussionConvertType, {
  label: string;
  icon: string;
  color: string;
}> = {
  CUSTOMER_REQUEST: {
    label: "고객요청 (REQ-XXXX)",
    icon: "contact_page",
    color: "text-blue-500",
  },
  COOPERATION: {
    label: "업무협조 (COOP-XXXX)",
    icon: "handshake",
    color: "text-cyan-500",
  },
  BLOCKED: {
    label: "보류",
    icon: "pause_circle",
    color: "text-gray-500",
  },
  COMPLETED: {
    label: "종료",
    icon: "done_all",
    color: "text-success",
  },
};
