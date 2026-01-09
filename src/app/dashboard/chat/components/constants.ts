/**
 * @file src/app/dashboard/chat/components/constants.ts
 * @description
 * 채팅 페이지에서 사용하는 상수들을 정의합니다.
 * 컴포넌트 외부에 정의하여 리렌더링 시 재생성을 방지합니다.
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

/**
 * 예시 질문 그룹 타입
 */
export interface ExampleGroup {
  title: string;
  icon: string;
  color: string;
  questions: string[];
}

/**
 * 예시 질문 그룹
 * 카테고리별로 분류된 제안 질문들
 * LLM이 정확히 SQL을 생성할 수 있도록 구체적인 예시 제공
 * 각 그룹: 조회 2개 + 등록 1개 + 변경 1개
 */
export const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    title: "WBS",
    icon: "account_tree",
    color: "text-blue-500",
    questions: [
      "현재 프로젝트의 WBS 구조를 마인드맵으로 보여줘",
      "종료일이 지났는데 완료되지 않은 WBS 항목 목록 알려줘",
      "WBS '설계' 항목의 종료일을 1월 31일로 변경해줘",
      "WBS '개발' 항목의 진행률을 50%로 업데이트해줘",
    ],
  },
  {
    title: "태스크",
    icon: "task_alt",
    color: "text-emerald-500",
    questions: [
      "현재 프로젝트의 태스크 상태별 개수를 차트로 보여줘",
      "이번 주 금요일까지 마감인 태스크 목록을 알려줘",
      "새 태스크 등록해줘: API 연동 기능 개발, 우선순위 HIGH",
      "태스크 'API 연동' 상태를 IN_PROGRESS로 변경해줘",
    ],
  },
  {
    title: "이슈",
    icon: "bug_report",
    color: "text-rose-500",
    questions: [
      "현재 프로젝트에서 진행 중인 이슈 목록을 보여줘",
      "우선순위가 HIGH 이상인 미해결 이슈 목록 알려줘",
      "새 이슈 등록해줘: 로그인 페이지 오류 발생, 우선순위 URGENT",
      "이슈 '로그인 오류' 상태를 RESOLVED로 변경해줘",
    ],
  },
  {
    title: "요구사항",
    icon: "description",
    color: "text-amber-500",
    questions: [
      "현재 프로젝트의 요구사항 상태별 현황을 알려줘",
      "REVIEW 상태인 승인 대기 요구사항 목록 보여줘",
      "새 요구사항 등록해줘: 사용자 인증 기능 구현, 우선순위 HIGH",
      "요구사항 '사용자 인증' 상태를 APPROVED로 변경해줘",
    ],
  },
  {
    title: "도움말",
    icon: "help",
    color: "text-purple-500",
    questions: [
      "WBS Master에서 할 수 있는 기능을 알려줘",
      "키보드 단축키 목록을 알려줘",
      "채팅으로 데이터를 등록하는 방법을 알려줘",
      "채팅으로 상태나 일정을 변경하는 방법을 알려줘",
    ],
  },
];
