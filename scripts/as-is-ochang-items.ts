/**
 * @file scripts/as-is-ochang-items.ts
 * @description
 * 행성사 오창(구 폴오창) MES V2 의 현재 상태(AS-IS) 총괄 항목 데이터입니다.
 * scripts/import-as-is-ochang.ts 가 이 목록을 AS-IS 총괄표에 넣습니다.
 *
 * 초보자 가이드:
 * - 출처: C:\Project\poll 자료(MES 매뉴얼 2025-01-09, 구성도 2025-05-21, 필수기능 체크리스트 2025-02-04,
 *   WAS 배포 2025-03-21, 유지보수·고도화 LIST 2025-04-08, 제안요청서 2026-09-27, 자재입고 의사결정 2026-09-21)
 *   와 김산 책임(행성 정보전략팀) 메일(2026-10-22 이전 프로젝트 이슈, 2026-10-26 DIS 작업순서).
 * - AS-IS 는 현재 상태만 담습니다. 절곡 SFR 34건은 TO-BE·요구사항이므로 행으로 풀지 않았습니다.
 * - 유지보수 LIST(2025-04)·매뉴얼의 "V2.1 예정" 항목은 2025.09~2026.03 고도화 전 자료라
 *   현재 결함으로 단정하지 않고 "반영 여부 미확인"으로 적었습니다.
 * - 김산 메일의 "2026.09~2026.03", "2026.12.29" 는 2025 년의 오기로 보고 고친 값을 적었습니다.
 * - 이 파일은 기준·자재·생산 항목, as-is-ochang-items-2.ts 는 품질~기타 항목입니다. 타입·출처 상수는 as-is-ochang-sources.ts.
 * - 항목 순서가 화면 정렬 순서(order)이고, 관리번호는 OC-AS-001 부터 자동으로 붙습니다.
 */

import { type OchangAsIsItem, MANUAL_0, MANUAL_2, MANUAL_3, POP, RFP, LIST, MAIL_ISSUE, UNCHECKED } from "./as-is-ochang-sources";
import { SUPPORT_ITEMS } from "./as-is-ochang-items-2";

export type { OchangAsIsItem };

const CORE_ITEMS: OchangAsIsItem[] = [
  // ───────────── 기준관리 ─────────────
  {
    major: "MASTER", middle: "시스템", task: "사업장·공통코드·상태·단위·다국어 관리", method: "SYSTEM",
    details:
      "사업장: ERP 수신, 폴OU/PL2 사업장만 사용\n공통코드: ERP I/F 계정 코드·근무일 기준 등 공통 코드 관리\n상태관리: MES 전체 상태 유형·상태값·사용 여부\n단위: ERP 수신 단위 확인\n다국어: 전부 한국어로 운영(변경 불필요)",
    remarks: MANUAL_0,
  },
  {
    major: "MASTER", middle: "시스템", task: "WORKCALENDAR·사용자쿼리·ID 채번 규칙", method: "SYSTEM",
    details:
      "WORKCALENDAR: ERP I/F 생산·재고 실적 시간 기준, 매일 기본값 자동 생성, 행추가로 신규 생성\n사용자쿼리: 화면 조회 쿼리를 버전별로 관리(현황 화면 백엔드)\nID 채번 규칙: ID 패턴·채번 규칙 관리(사용자 수정 금지)\n로그인 현황·메뉴 사용현황 조회",
    remarks: `${MANUAL_0}, 구성도(2025-05-21)`,
  },
  {
    major: "MASTER", middle: "위치", task: "위치(공장·라인·창고) 관리", method: "SYSTEM",
    issue: "절곡융착·절곡 라인과 반제품 창고(W51·W52 안)는 아직 미등록",
    details:
      "위치는 ERP I/F 수신, MES 에서 사용 여부·관리 부서 지정\n공장 A1 조립(리드탭), 대표라인 PL_A1\n라인 = 호기 단위(설비 1대 = 라인 1개)\n- 융착다열: 라인 A01_P~A18_P / 설비 A1_A01~A18\n- 융착이열: 라인 B01_P~·C01_P~ / 설비 A1_B01~·C01~\n창고: W50 LEAD TAB 1 반제품(융착 반제품), W59 LEAD TAB 불량 반제품",
    remarks: `${MANUAL_0}, ${RFP} SFR-001 참고표`,
  },
  {
    major: "MASTER", middle: "생산제조", task: "제품·자재 코드, 고객사·공급사, Model Suffix", method: "SYSTEM",
    issue: "ERP 에서 Model Suffix 추가 시 MES I/F 누락 → I/F 개선·수동 입력 요청 이력",
    details:
      "고객사·공급사·자재코드: ERP I/F 수신, 사용 여부만 설정\n제품코드: ERP I/F 수신, 제품별 타입(융착/검사)·기본 라우팅 설정\nModel Suffix: ERP 정보를 바탕으로 생성, 항목별 데이터 입력·저장",
    remarks: `${MANUAL_0}; 이슈는 ${LIST} 유지보수 #11(${UNCHECKED})`,
  },
  {
    major: "MASTER", middle: "생산제조", task: "공정코드·라우팅 관리", method: "SYSTEM",
    details:
      "공정코드: 공정 목록 확인, 공정코드-설비 Mapping·설비 사용 여부\n융착 공정은 극성별 OPA01·OPA02, 비전은 설비 공정에 포함\n라우팅: 라우팅 1개 = 공정 1개(현행 라우팅 모두 공정 1개), 융착 PFA01·PFA02\n공정별로 작업지시를 따로 내는 구조(융착·표면처리 동일)",
    remarks: `${MANUAL_0}, ${RFP} SFR-003·004 참고`,
  },
  {
    major: "MASTER", middle: "생산제조", task: "불량코드·불량 LOT 유형 관리", method: "SYSTEM",
    details:
      "불량그룹·불량코드 등록, 공정별 불량코드 연결\n공정별 연결 174건: 공정불량 114·외관검사 30·기타 15·비전 12·샘플 8·LOSS 2 (예: (+)융착 66건)\n불량 LOT 유형(LOT 번호 끝자리): S 샘플·D1 결함·D2 기타불량(수동), D3 융착 성형부폐기(자동 TAG), D4 융착 비전불량(자동 CSV)",
    remarks: `${MANUAL_0}, ${RFP} SFR-005 참고표`,
  },
  {
    major: "MASTER", middle: "생산제조", task: "BOM 조회·자재 장착 Template", method: "SYSTEM",
    issue: "일부 LOT 자재차감 누락 — 생산 중 MBOM 변경 등 환경 요인으로 추정(소스 원인 아님)",
    details:
      "BOM: ERP I/F 수신 BOM 조회만 가능, MES 에서 수정 불가\n자재 장착 Template: ERP BOM + 라우팅으로 자동 생성(기본 라우팅이 설정돼야 생성), 수동 생성 가능",
    remarks: `${MANUAL_0}; 이슈는 ${MAIL_ISSUE} 고도화 13주차, ${LIST} 유지보수 #4`,
  },

  // ───────────── 자재관리 ─────────────
  {
    major: "MATERIAL", middle: "입고", task: "자재 입하·IQC·입고(PDA)", method: "SYSTEM",
    issue: "월말 대량 컨테이너 입하 시 전 품목 Lot 라벨 부착이 병목 — 현업은 B/L 가입고 요구, 대표 라벨+후행 Lot 분할(안 B) 검토 중",
    details:
      "흐름: 바코드 식별 → 업체 바코드 매핑 → IQC 합격(QMS) → MES 입고 → ERP 전송\nPDA 재고입고(자재입고) 메뉴로 현장 처리\n입하등록에는 수입검사 대기·합격만 표시(불합격 표시 없음), 입고 취소 시 이전 입고 이력이 함께 보이는 문제 요청 이력",
    remarks: `자재입고 프로세스 의사결정(2026-09-21), 구성도(2025-05-21); 표시 문제는 ${LIST} #48·#52(${UNCHECKED})`,
  },
  {
    major: "MATERIAL", middle: "불출", task: "자재 불출 요청·불출", method: "SYSTEM",
    issue: "자재 불출·출하 선입선출 인터락이 업무 미정의로 2차 연기·개발 지연",
    details:
      "작업지시 확정 시 불출 요청 자동 생성\n자재 불출 요청 등록: 창고·W/O 지정 후 수량 설정·저장\nPDA 자재불출(작업지시 기준 표시 → 불출 요청서 기준 표시 요청 이력)",
    remarks: `${MANUAL_2}; 이슈는 ${MAIL_ISSUE} 고도화 10·11주차, ${LIST} #6·#12·#43`,
  },
  {
    major: "MATERIAL", middle: "외주", task: "외주 공정(Slitting·Edge) 자재·입고", method: "MIXED",
    details:
      "관리 공정 중 Slitting·Edge 는 외주\n외주자재불출·외주 입고 처리, 외주 입고건은 1일 합계 수량으로 ERP I/F(개선 요청 이력)",
    remarks: `${RFP} 2.시스템 현황; ${LIST} #8·#54(${UNCHECKED}). 외주 공정의 현장 처리 방식은 현업 확인 필요`,
  },

  // ───────────── 생산관리 ─────────────
  {
    major: "PRODUCTION", middle: "생산계획", task: "생산계획(P/O) 현황", method: "SYSTEM",
    issue: "계획(건)·실적 누계 데이터 불일치, 잦은 계획 변경(2025-11-21 지연보고)",
    details: "ERP 생산계획(P/O) 수신\n기간·PO No·공정(엣지/표면처리/융착/검사)별 P/O 현황과 확정 상태 조회",
    remarks: `${MANUAL_2}; 이슈는 ${MAIL_ISSUE}`,
  },
  {
    major: "PRODUCTION", middle: "작업지시", task: "작업지시(W/O) 관리", method: "SYSTEM",
    details:
      "메뉴: 작업지시(표면처리&융착다열)\nP/O 선택 → W/O 등록·저장 → 확정(취소)·마감(취소)·삭제\n확정 시 설비 PORT 별 자재장착 MBOM·자재 요청 생성",
    remarks: `${MANUAL_2}, ${RFP} SFR-009`,
  },
  {
    major: "PRODUCTION", middle: "작업준비", task: "호기별 근무등록(UI·POP·PDA)", method: "SYSTEM",
    details:
      "부서(조립·엣지·표면처리·OQC)·설비·시작/종료 시간 등록\n근무 시작 전·종료 후에는 실적 등록 불가\n근무등록이 돼야 자재 장착·작업 시작·외관검사 조회 가능\n근무 시간 10분 단위 변경 요청 이력",
    remarks: `${MANUAL_2}, ${POP}; ${LIST} #27(${UNCHECKED})`,
  },
  {
    major: "PRODUCTION", middle: "작업준비", task: "자재 장착", method: "SYSTEM",
    details: "W/O 의 BOM 자재를 설비에 장착(현장은 PDA/POP)\n공정(엣지/표면처리/융착/검사)별 W/O 조회 후 원자재 선택·장착 등록\n호기별 근무등록 필수",
    remarks: MANUAL_3,
  },
  {
    major: "PRODUCTION", middle: "작업준비", task: "작업 시작·중지(작업관리)", method: "SYSTEM",
    details: "현장은 PDA 로 작업지시 시작·중지, 실적 확인\n자재 장착이 없으면 작업 시작 불가, 근무등록 필수",
    remarks: MANUAL_3,
  },
  {
    major: "PRODUCTION", middle: "실적", task: "생산보고(POP) — 실적·불량·LOSS·채움", method: "SYSTEM",
    details:
      "LOT 생성 → 생산 수량 입력 → 실적보고, LOT 선택 후 불량·LOSS 보고\nLOT 생성 후 실적보고를 해야 새 LOT 생성 가능, 불량 보고 후 실적 수정 불가\n채움 LOT: W/O 당 1개, 채움 LOT 이 있으면 W/O 마감 불가(해제 필요), 재고이동으로 수량 채움\nLOT 색: 노랑 채움·파랑 가용(양품)·주황 불량",
    remarks: POP,
  },
  {
    major: "PRODUCTION", middle: "실적", task: "융착 자동 실적(OPC 설비 TAG)", method: "SYSTEM",
    issue: "MES V2 구축 때 설비 I/F 항목·TAG 선정이 늦어 개발 지연(이전 대상 호기 미확정, Tag 1차 선정 후 추가 협의)",
    details:
      "융착(조립)은 자동 실적보고\n흐름: 구심 설비 TAG(PLC) → OPC 서버(HawkEyesDAS) → PLC_TAG → PLC_QUEUE → SCHEDULER 큐 소비 → 실적(TRACK OUT, 만재 TRAYOUT)\n융착다열 18호기(설비 배출 리드탭 4EA) + 융착이열, 비전검사 TAG 는 수집 안 함",
    remarks: `${POP}, ${RFP} 2.시스템 현황·SFR-012; 이슈는 ${MAIL_ISSUE} 구축 10~21주차`,
  },
  {
    major: "PRODUCTION", middle: "추적", task: "LOT 이력·추적 조회", method: "SYSTEM",
    issue: "LOT 정·역방향 추적은 매뉴얼 기준 V2.1 예정, 원소재 업체 LOT~출하 LOT 통합 Tracking 요구 이력",
    details:
      "Lot 이력조회: LOT S/N 으로 전 공정·수량·시간·설비·상태·원자재 이력 조회\nLOT 계보: 제품 LOT 의 MOTHERROLL = 투입 LOT 역전개 방식\nLot 추적조회(정·역방향): 2025-01 매뉴얼 기준 미개발",
    remarks: `${MANUAL_3}, ${RFP} SFR-027; ${LIST} REPORT #22(${UNCHECKED})`,
  },
  {
    major: "PRODUCTION", middle: "리포트", task: "공정 리포트(실적·불량·수율·설비이력)", method: "SYSTEM",
    issue: "생산현황 요약·누적 생산·계획 대비 실적·작업자별 합격률 등 REPORT 고도화 요구 다수",
    details:
      "일별 실적조회, 불량현황 조회, 모델별 수율(주/야간 그래프·표), 호기별 대표불량 현황, 생산실적현황\n비전 치수검사 파일 다운로드, 설비 이력 현황(TAG 그래프·LOT)",
    remarks: `${MANUAL_3}; ${LIST} REPORT 고도화 25건(${UNCHECKED})`,
  },
  {
    major: "PRODUCTION", middle: "절곡 라인", task: "신규 절곡 라인(8대) — 현행 MES 관리 범위 밖", method: "MANUAL",
    issue: "신규 절곡융착 4대·절곡 4대가 MES 에 없어 작업지시·실적·불량·추적성 관리 불가",
    details:
      "LBC 라인 대응 신규 설비: 절곡융착 4대(양극 2·음극 2) + 절곡 4대(양극 2·음극 2)\nSemi-Inline + AMR 2대 Tray 이송(반경 12m), 설비 배출 리드탭 2EA\n설비 PLC 수집 태그는 DIS 가 확정·업무분석·미들웨어·PLC 수정 진행 중(10월 5주 태그 1차 확정 → 11월 4주 적용 → 12/15 안정화 예정)\n현재 현장 운영 방식(수기 여부 등)은 확인 필요",
    remarks: `${RFP} 1.사업 개요·4-1; 김산 메일 'DIS 작업순서'(2026-10-26). 현행방식 '수기'는 MES 미관리를 뜻하는 임시 값`,
  },
];

/** 화면 정렬 순서대로 전체 항목 (기준·자재·생산 → 품질·설비·재고·출하·기타) */
export const OCHANG_AS_IS_ITEMS: OchangAsIsItem[] = [...CORE_ITEMS, ...SUPPORT_ITEMS];
