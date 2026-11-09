/**
 * @file scripts/as-is-ochang-sources.ts
 * @description
 * 오창 AS-IS 항목 데이터의 타입과 출처 문서 이름 상수입니다.
 *
 * 초보자 가이드:
 * - OchangAsIsItem: AS-IS 총괄표 한 행(대분류·중분류·업무명·현행방식·이슈·세부내용·비고)
 * - 출처 상수는 비고(remarks)에 같은 문구를 반복하지 않으려고 둡니다.
 * - 항목 데이터는 as-is-ochang-items.ts(기준·자재·생산)와 as-is-ochang-items-2.ts(품질~기타)에 있습니다.
 */

export type OchangAsIsItem = {
  major: "MASTER" | "MATERIAL" | "PRODUCTION" | "QUALITY" | "EQUIPMENT" | "INVENTORY" | "SHIPMENT" | "OTHER";
  middle: string;
  task: string;
  method: "SYSTEM" | "MANUAL" | "EXCEL" | "MIXED";
  issue?: string;
  details: string;
  remarks: string;
};

export const MANUAL_0 = "MES 매뉴얼 0.기준정보(2025-01-09)";
export const MANUAL_2 = "MES 매뉴얼 2.생산계획(2025-01-09)";
export const MANUAL_3 = "MES 매뉴얼 3.공정관리(2025-01-09)";
export const MANUAL_4 = "MES 매뉴얼 4.품질관리(2025-01-09)";
export const POP = "MESV2 POP 매뉴얼(2025-01-09)";
export const RFP = "제안요청서(2026-09-27)";
export const LIST = "유지보수·고도화 LIST(2025-04-08)";
export const MAIL_ISSUE = "김산 메일 '이전 프로젝트 주요 이슈'(2026-10-22)";
export const UNCHECKED = "LIST 요청은 2025.09~2026.03 고도화 반영 여부 미확인";
