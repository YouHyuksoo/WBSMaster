/**
 * @file src/app/dashboard/chat/components/constants.ts
 * @description
 * 채팅 페이지에서 사용하는 상수들을 정의합니다.
 * 컴포넌트 외부에 정의하여 리렌더링 시 재생성을 방지합니다.
 * 초보자 가이드: 제안 문구는 @/lib/chat-suggestions에서 관리합니다.
 */

/**
 * 차트 색상 팔레트
 */
export const CHART_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

/** 화면과 생성 API가 동일한 제안 계약을 사용한다. */
export { EXAMPLE_GROUPS } from "@/lib/chat-suggestions";
export type { ExampleGroup } from "@/lib/chat-suggestions";
