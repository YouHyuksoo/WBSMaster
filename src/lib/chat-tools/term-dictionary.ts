/**
 * @file src/lib/chat-tools/term-dictionary.ts
 * @description
 * 사용자가 쓰는 한국어 표현을 Prisma Enum 값으로 바꾸는 사전입니다. 조회 도구 설명에 붙여 LLM 이 인자를 고르게 합니다.
 *
 * 초보자 가이드:
 * - 예: "긴급한 이슈" → priority CRITICAL. TASK 우선순위에는 CRITICAL 이 없으므로 "긴급" → HIGH.
 * - Prisma Enum 에 값이 추가되면 term-dictionary.test.ts 가 실패한다. 여기 표현을 추가한다.
 * - 화면 라벨과 맞춘다 (issues/page.tsx 의 PRIORITY 라벨, discussion-items/types.ts 의 STATUS_CONFIG 등).
 */

export const TERM_DICTIONARY = {
  issueStatus: {
    OPEN: ["열린", "열림", "미해결", "신규", "오픈"],
    IN_PROGRESS: ["진행중", "진행 중", "처리중"],
    RESOLVED: ["해결", "해결됨"],
    CLOSED: ["종료", "닫힘", "완료"],
    WONT_FIX: ["수정안함", "보류", "대응 안 함"],
  },
  issuePriority: {
    CRITICAL: ["긴급", "치명", "최우선"],
    HIGH: ["높음", "중요"],
    MEDIUM: ["보통"],
    LOW: ["낮음"],
  },
  taskStatus: {
    PENDING: ["대기", "대기중", "시작 전"],
    IN_PROGRESS: ["진행중", "진행 중"],
    HOLDING: ["홀딩", "보류"],
    DELAYED: ["지연", "마감 초과"],
    COMPLETED: ["완료", "끝난"],
    CANCELLED: ["취소"],
  },
  taskPriority: {
    HIGH: ["높음", "긴급", "중요"],
    MEDIUM: ["보통"],
    LOW: ["낮음"],
  },
  fieldIssueStatus: {
    OPEN: ["발견", "열린", "미해결", "신규"],
    IN_PROGRESS: ["수정중", "수정 중", "진행중"],
    RESOLVED: ["해결"],
    WONT_FIX: ["수정안함", "대응 안 함"],
    CLOSED: ["완료", "종료"],
    PENDING: ["대기(레거시)"],
    COMPLETED: ["완료(레거시)"],
  },
  discussionStatus: {
    DISCUSSING: ["협의중", "협의 중", "진행중"],
    CONVERTED_TO_REQUEST: ["고객요청으로 변환"],
    CONVERTED_TO_COOPERATION: ["업무협조로 변환"],
    BLOCKED: ["보류", "지연", "막힘"],
    COMPLETED: ["종료", "결정완료", "완료"],
  },
  discussionPriority: {
    HIGH: ["높음", "긴급"],
    MEDIUM: ["보통"],
    LOW: ["낮음"],
  },
  requirementStatus: {
    DRAFT: ["초안"],
    REVIEW: ["검토중", "검토 중"],
    APPROVED: ["승인"],
    REJECTED: ["반려"],
    IMPLEMENTED: ["구현완료", "구현 완료", "완료"],
  },
  applyStatus: {
    REVIEWING: ["검토중", "검토 중", "접수"],
    APPROVED: ["승인"],
    REJECTED: ["반려"],
    IN_DEVELOPMENT: ["개발중", "개발 중", "진행중"],
    APPLIED: ["적용", "적용완료", "완료"],
    HOLD: ["보류"],
  },
  discussionStage: {
    ANALYSIS: ["분석"],
    DESIGN: ["설계"],
    IMPLEMENTATION: ["구현", "개발"],
    TESTING: ["테스트", "시험"],
    OPERATION: ["운영", "적용"],
  },
  issueCategory: {
    BUG: ["버그", "오류", "결함"],
    IMPROVEMENT: ["개선"],
    QUESTION: ["질문", "문의"],
    FEATURE: ["기능", "기능 요청"],
    DOCUMENTATION: ["문서"],
    OTHER: ["기타"],
  },
  milestoneStatus: {
    PENDING: ["대기", "예정"],
    IN_PROGRESS: ["진행중", "진행 중"],
    COMPLETED: ["완료"],
    DELAYED: ["지연"],
  },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type TermDictionaryKey = keyof typeof TERM_DICTIONARY;

/** 도구 설명에 붙일 안내 ("CRITICAL=긴급/치명/최우선, HIGH=높음/중요 ...") */
export function termGuide(key: TermDictionaryKey): string {
  return Object.entries(TERM_DICTIONARY[key])
    .map(([value, words]) => `${value}=${(words as readonly string[]).join("/")}`)
    .join(", ");
}

/** 확인 카드에 보일 한글 라벨 (사전의 첫 표현). 없으면 값 그대로 */
export function termLabel(key: TermDictionaryKey, value: string): string {
  const words = (TERM_DICTIONARY[key] as Record<string, readonly string[]>)[value];
  return words?.[0] ?? value;
}

/** 사전 키의 Enum 값 목록 */
export function enumValues(key: TermDictionaryKey): string[] {
  return Object.keys(TERM_DICTIONARY[key]);
}
