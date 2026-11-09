/**
 * @file src/lib/chat-tools/entities/types.ts
 * @description
 * AI 채팅 공통 등록·수정·삭제(propose_create_record / propose_update_record / propose_delete_records)의 메뉴 정의 타입입니다.
 *
 * 초보자 가이드:
 * - EntitySpec 하나가 화면 메뉴 하나(예: 마일스톤)다. 필드 이름은 그 화면 API(POST/PATCH body)와 같게 둔다.
 * - 실행은 확인 API 가 같은 요청 안에서 화면 API 핸들러(routes)를 그대로 부른다.
 *   그래서 인증·권한·채번·알림이 화면에서 등록할 때와 똑같다.
 * - refFields: 수정·삭제 대상을 사용자가 부르는 칼럼 (코드·이름·제목). 현재 프로젝트 안에서만 찾는다.
 */

/** 필드 종류. person 은 이름 → 사용자 id(to), people 은 여러 이름 → id 배열(to) */
/** list: 문자열 배열 (사람 이름 변환 없음, 예: 회의 내용 줄들) */
export type EntityFieldType = "string" | "date" | "int" | "bool" | "enum" | "person" | "people" | "list";

export interface EntityField {
  key: string;
  label: string;
  type: EntityFieldType;
  /** enum 허용값 */
  values?: readonly string[];
  /** enum 값 → 화면 한글 라벨 (확인 카드 표시, 한글 입력 허용) */
  labels?: Record<string, string>;
  /** 등록 시 필수 */
  required?: boolean;
  /** 등록에서만 받는다 (prepareCreate 가 다른 본문으로 바꾸는 필드) */
  createOnly?: boolean;
  /** person/people: 화면 API 에 보낼 칼럼 이름 (예: assigneeId) */
  to?: string;
}

/** 화면 API 라우트 모듈 (동적 import) */
export type RouteModule = Record<string, unknown>;

export interface EntitySpec {
  key: string;
  label: string;
  /** prisma 모델 delegate 이름 */
  model: string;
  /** 수정·삭제 대상을 찾는 칼럼 (앞에서부터 하나라도 같으면 일치) */
  refFields: string[];
  /** 현재 프로젝트 범위 where (기본 { projectId }) */
  scope?: (projectId: string) => Record<string, unknown>;
  fields: EntityField[];
  /** 결과 화면 링크 */
  link: string;
  /** 지원 동작 (공통 도구 기준. 기존 전용 도구가 있는 동작은 빼 둔다) */
  ops: { create?: boolean; update?: boolean; delete?: boolean };
  /** POST 가 있는 라우트 (/api/xxx) */
  collectionRoute?: () => Promise<RouteModule>;
  collectionPath?: string;
  /** PATCH/PUT/DELETE 가 있는 라우트 (/api/xxx/[id]) */
  itemRoute?: () => Promise<RouteModule>;
  itemPath?: (id: string) => string;
  /** 수정 메서드 (기본 PATCH) */
  updateMethod?: "PATCH" | "PUT";
  /** 등록 본문에 서버가 채워 넣을 값 (예: AS-IS 총괄 id, WBS 부모·레벨) */
  prepareCreate?: (ctx: EntityCtx, data: Record<string, unknown>) => Promise<Record<string, unknown> | { error: string }>;
  /** 삭제 시 함께 지워지는 데이터 안내 (예: "하위 4건 함께 삭제") */
  deleteImpact?: (ctx: EntityCtx, ids: string[]) => Promise<string | undefined>;
}

/** 어댑터가 쓰는 최소 맥락 (ToolContext 의 부분집합) */
export interface EntityCtx {
  projectId: string;
  prisma: unknown;
}
