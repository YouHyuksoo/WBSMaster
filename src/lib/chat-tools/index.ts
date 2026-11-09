/**
 * @file src/lib/chat-tools/index.ts
 * @description
 * AI 채팅 기본 레지스트리(defaultRegistry)에 모든 도구를 등록합니다. 채팅 API 가 이 파일을 한 번 import 합니다.
 *
 * 초보자 가이드:
 * - 새 도구는 여기서 defaultRegistry.register(...) 한 줄로 추가한다.
 * - 2단계(지성지식관리 연동)의 search_knowledge 도 여기에 등록한다.
 */

import { defaultRegistry } from "./registry";
import { findPeopleTool } from "./people";
import { listWbsTool, wbsScheduleStatsTool } from "./wbs";
import { getRecordTool, LIST_TOOLS } from "./records";
import { runReadonlySqlTool } from "./readonly-sql";
import { PROPOSAL_TOOLS } from "./proposals";
import { ENTITY_TOOLS } from "./entities";
import { WEEKLY_REPORT_TOOLS } from "./weekly-report";

import type { ChatTool } from "./types";

// 도구마다 인자 타입이 달라 공통 ChatTool 로 모은다 (parse 가 인자를 검증하므로 안전)
const ALL = [
  findPeopleTool, wbsScheduleStatsTool, listWbsTool, ...Object.values(LIST_TOOLS), getRecordTool,
  ...Object.values(PROPOSAL_TOOLS), ...ENTITY_TOOLS, ...WEEKLY_REPORT_TOOLS, runReadonlySqlTool,
] as unknown as ChatTool[];

for (const tool of ALL) {
  if (!defaultRegistry.get(tool.name)) defaultRegistry.register(tool);
}

export { defaultRegistry };
