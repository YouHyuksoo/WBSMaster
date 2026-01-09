/**
 * @file src/app/dashboard/wbs/types.ts
 * @description
 * WBS 페이지에서 사용하는 타입 정의입니다.
 * 인터페이스와 타입 별칭을 관리합니다.
 *
 * 초보자 가이드:
 * 1. **CalculatedDates**: 상위 항목의 계산된 날짜
 * 2. **ProjectScheduleStats**: 프로젝트 일정 통계
 * 3. **WbsTreeItemProps**: 트리 항목 컴포넌트 Props
 * 4. **DragState**: 간트 차트 드래그 상태
 */

import type { WbsItem, WbsLevel, TeamMember } from "@/lib/api";

/** 계산된 날짜 (상위 항목용) */
export interface CalculatedDates {
  startDate: string | null;
  endDate: string | null;
}

/** 프로젝트 일정 통계 */
export interface ProjectScheduleStats {
  /** 총 프로젝트 일수 */
  totalDays: number;
  /** 휴무일수 (주말) */
  weekendDays: number;
  /** 작업가능일수 */
  workableDays: number;
  /** 경과일수 */
  elapsedDays: number;
  /** 남은 일수 */
  remainingDays: number;
}

/** 간트 차트 드래그 상태 */
export interface DragState {
  /** 드래그 중인 항목 ID */
  itemId: string;
  /** 드래그 타입: 이동, 시작일 조정, 종료일 조정 */
  type: "move" | "resize-start" | "resize-end";
  /** 드래그 시작 X 좌표 */
  startX: number;
  /** 원본 시작일 */
  originalStart: string;
  /** 원본 종료일 */
  originalEnd: string;
}

/** 간트 차트 날짜 정보 */
export interface GanttDateInfo {
  date: Date;
  day: number;
  month: number;
  dayName: string;
  isWeekend: boolean;
  isToday: boolean;
}

/** 새 항목 폼 상태 */
export interface NewItemForm {
  name: string;
  description: string;
  level: WbsLevel;
  parentId?: string;
  assigneeIds: string[];
  startDate: string;
  endDate: string;
  progress: number;
  weight: number;
  deliverableName: string;
  deliverableLink: string;
}

/** WBS 트리 항목 컴포넌트 Props */
export interface WbsTreeItemProps {
  /** WBS 항목 데이터 */
  item: WbsItem;
  /** 펼쳐진 항목 ID 집합 */
  expandedIds: Set<string>;
  /** 선택된 항목 ID */
  selectedId: string | null;
  /** 체크된 항목 ID 집합 */
  checkedIds: Set<string>;
  /** 펼치기/접기 토글 */
  onToggle: (id: string) => void;
  /** 항목 선택 */
  onSelect: (id: string) => void;
  /** 체크박스 토글 */
  onCheck: (id: string, checked: boolean) => void;
  /** 하위 항목 추가 */
  onAddChild: (parentId: string, level: WbsLevel) => void;
  /** 항목 수정 */
  onEdit: (item: WbsItem) => void;
  /** 항목 삭제 */
  onDelete: (id: string) => void;
  /** 레벨 올리기 */
  onLevelUp: (id: string) => void;
  /** 레벨 내리기 */
  onLevelDown: (id: string) => void;
  /** Task 등록 */
  onRegisterTask: (item: WbsItem) => void;
  /** 진행률 업데이트 */
  onUpdateProgress: (id: string, progress: number) => void;
  /** 산출물 미리보기 */
  onPreviewDeliverable: (url: string) => void;
}

/** 간트 바 컴포넌트 Props */
export interface GanttBarProps {
  /** WBS 항목 데이터 */
  item: WbsItem;
  /** 행 인덱스 */
  rowIndex: number;
  /** 셀 너비 (px) */
  cellWidth: number;
  /** 차트 시작일 */
  chartStartDate: Date;
  /** 선택 여부 */
  isSelected: boolean;
  /** 드래그 중 여부 */
  isDragging: boolean;
  /** 드래그 델타값 */
  dragDelta: number;
  /** 드래그 타입 */
  dragType?: "move" | "resize-start" | "resize-end";
  /** 드래그 시작 핸들러 */
  onDragStart: (
    e: React.MouseEvent,
    itemId: string,
    type: "move" | "resize-start" | "resize-end",
    startDate: string,
    endDate: string
  ) => void;
  /** 클릭 핸들러 */
  onClick: (id: string) => void;
}

/** WBS 폼 모달 Props */
export interface WbsFormModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 수정할 항목 (null이면 추가 모드) */
  editingItem: WbsItem | null;
  /** 팀 멤버 목록 */
  teamMembers: TeamMember[];
  /** 폼 데이터 */
  formData: NewItemForm;
  /** 폼 데이터 변경 핸들러 */
  onFormChange: (data: Partial<NewItemForm>) => void;
  /** 저장 핸들러 */
  onSubmit: (e: React.FormEvent) => void;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/** 일괄 배정 모달 Props */
export interface BulkAssignModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 선택된 항목 수 */
  checkedCount: number;
  /** 팀 멤버 목록 */
  teamMembers: TeamMember[];
  /** 선택된 담당자 ID 목록 */
  selectedAssigneeIds: string[];
  /** 담당자 선택 변경 핸들러 */
  onAssigneeChange: (ids: string[]) => void;
  /** 배정 핸들러 */
  onAssign: () => void;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/** 산출물 미리보기 모달 Props */
export interface DeliverablePreviewModalProps {
  /** 미리보기 URL */
  url: string | null;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/** WBS 통계 */
export interface WbsStats {
  /** 총 항목 수 */
  total: number;
  /** 완료 항목 수 */
  completed: number;
  /** 진행 중 항목 수 */
  inProgress: number;
  /** 대기 항목 수 */
  pending: number;
  /** 지연 항목 수 */
  delayed: number;
  /** 전체 진행률 */
  overallProgress: number;
}
