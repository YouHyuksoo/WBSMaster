/**
 * @file src/lib/chat-tools/index.ts
 * @description
 * AI 채팅 기본 레지스트리(defaultRegistry)에 모든 도구를 등록합니다. 채팅 API 가 이 파일을 한 번 import 합니다.
 *
 * 초보자 가이드:
 * - 새 도구는 여기서 defaultRegistry.register(...) 한 줄로 추가한다.
 * - search_knowledge는 지성지식관리의 의미·관계 검색을 호출하는 기본 도구다.
 */

import { defaultRegistry } from "./registry";
import { findPeopleTool } from "./people";
import { listWbsTool, wbsScheduleStatsTool } from "./wbs";
import { getRecordTool, LIST_TOOLS } from "./records";
import { runReadonlySqlTool } from "./readonly-sql";
import { PROPOSAL_TOOLS } from "./proposals";
import { ENTITY_TOOLS } from "./entities";
import { WEEKLY_REPORT_TOOLS } from "./weekly-report";
import { MEETING_TOOLS } from "./meeting-items";
import { searchKnowledgeTool, listKnowledgeDocumentsTool } from "./knowledge";
import { TO_BE_TOOLS } from "./to-be";

import type { ChatTool } from "./types";

// 도구마다 인자 타입이 달라 공통 ChatTool 로 모은다 (parse 가 인자를 검증하므로 안전)
const ALL = [
  findPeopleTool, wbsScheduleStatsTool, listWbsTool, ...Object.values(LIST_TOOLS), getRecordTool,
  ...Object.values(PROPOSAL_TOOLS), ...ENTITY_TOOLS, ...WEEKLY_REPORT_TOOLS, ...MEETING_TOOLS, ...TO_BE_TOOLS, runReadonlySqlTool, searchKnowledgeTool, listKnowledgeDocumentsTool,
] as unknown as ChatTool[];

for (const tool of ALL) {
  if (!defaultRegistry.get(tool.name)) defaultRegistry.register(tool);
}

export { defaultRegistry };
