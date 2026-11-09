/**
 * @file src/lib/chat-tools/entities/index.ts
 * @description
 * AI 채팅 공통 등록·수정·삭제 메뉴 목록과 도구입니다.
 *
 * 초보자 가이드:
 * - ENTITY_SPECS: 메뉴 정의 전체 (specs-records.ts + specs-core.ts)
 * - ENTITY_TOOLS: propose_create_record · propose_update_record · propose_delete_records
 * - 회의록 등 새 메뉴는 specs 파일에 정의를 추가하면 도구 설명·검증·실행에 자동으로 들어간다.
 */

import { CORE_SPECS } from "./specs-core";
import { RECORD_SPECS } from "./specs-records";
import { makeEntityTools } from "./tools";

export const ENTITY_SPECS = [...RECORD_SPECS, ...CORE_SPECS];
export const ENTITY_TOOLS = makeEntityTools(ENTITY_SPECS);
export { executeEntityAction } from "./execute";
