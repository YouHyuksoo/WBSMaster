/**
 * @file scripts/to-be-ochang-items.ts
 * @description
 * 행성사 오창 MES V2 의 TO-BE 초안 데이터입니다. scripts/import-to-be-ochang.ts 가 읽어 TO-BE 총괄표에 넣습니다.
 *
 * 초보자 가이드:
 * - 기준: 제안요청서(2026-09-27) 범위 = 신규 절곡 라인(절곡융착 4대 · 절곡 4대) MES 확장. 범위 밖 AS-IS 업무는 KEEP(유지).
 * - asIs 에 적은 AS-IS 관리번호(OC-AS-xxx)와 연결한다. major · middle · task 를 비우면 AS-IS 값을 그대로 쓴다.
 * - sfr 은 업무기능추적표의 TO-BE 관리번호(SFR · INR · PER 등)와 같은 문자열이어야 한다 (스크립트가 검사한다).
 * - 요약 끝의 "근거"는 AS-IS 비고에 SFR 번호가 적힌 경우, "업무명 대응"은 SFR 이름과 업무명이 맞아 붙인 추정 연결이다.
 * - 모두 DRAFT(작성중)로 넣는다. 현업 협의 후 화면에서 고친다.
 */

export type ToBeChange = "NEW" | "IMPROVE" | "KEEP" | "RETIRE";
export type ToBeMethod = "SYSTEM" | "AUTO" | "POP" | "PDA" | "MANUAL";
export type ToBeMajor = "MASTER" | "MATERIAL" | "PRODUCTION" | "QUALITY" | "EQUIPMENT" | "INVENTORY" | "SHIPMENT" | "OTHER";

export interface ToBeSeed {
  /** 연결할 AS-IS 관리번호. 첫 번째 AS-IS 의 분류 · 업무명을 기본값으로 쓴다 */
  asIs: string[];
  major?: ToBeMajor;
  middle?: string;
  task?: string;
  change: ToBeChange;
  method: ToBeMethod;
  summary: string;
  sfr: string[];
  priority?: "HIGH" | "MEDIUM" | "LOW";
  /** AS-IS 이슈 요약 → 해결 방안 (결과는 모두 OPEN 미해결로 넣는다) */
  fixes?: Array<{ issue: string; solution: string }>;
  /** 새 TO-BE 업무를 총괄표에서 이 AS-IS 업무 뒤에 보여 준다 */
  after?: string;
}

const OUT = "제안요청서 범위(절곡 라인 MES 확장) 밖, 현행 유지.";

/** AS-IS 43건 1:1 */
export const AS_IS_BASED: ToBeSeed[] = [
  { asIs: ["OC-AS-001"], change: "KEEP", method: "SYSTEM", sfr: [], summary: `${OUT} 사업장 · 공통코드는 ERP 수신 구조 그대로 쓴다.` },
  { asIs: ["OC-AS-002"], change: "KEEP", method: "SYSTEM", sfr: [], summary: `${OUT} 절곡 실적도 같은 WORKCALENDAR 기준으로 ERP 실적 시간에 귀속한다.` },
  {
    asIs: ["OC-AS-003"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-001"],
    summary: "절곡융착 · 절곡 라인(호기 단위)과 반제품 창고(W51 · W52 안)를 위치로 등록한다. (근거: AS-IS 비고 SFR-001)",
    fixes: [{ issue: "절곡융착 · 절곡 라인과 반제품 창고(W51 · W52 안) 미등록", solution: "SFR-001 위치관리에서 절곡 라인(호기 단위)과 반제품 창고를 등록한다." }],
  },
  {
    asIs: ["OC-AS-004"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-008", "INR-008"],
    summary: "ERP 품목 수신에 절곡 속성을 반영하고 수신 로그를 남긴다. (업무명 대응: SFR-008 제품코드정보 ERP I/F)",
    fixes: [{ issue: "ERP 에서 Model Suffix 추가 시 MES I/F 누락", solution: "SFR-008 수신 로그로 누락 건을 확인한다. 누락 자체를 막는 방법은 ERP 측과 협의한다." }],
  },
  { asIs: ["OC-AS-005"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-003", "SFR-004"],
    summary: "절곡융착 · 절곡 공정코드와 라우팅을 등록하고 품목에 라우팅을 연결한다. 라우팅 1개 = 공정 1개 구조는 유지한다. (근거: AS-IS 비고 SFR-003 · 004)" },
  { asIs: ["OC-AS-006"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-005"],
    summary: "절곡 공정 불량코드를 등록하고, 비전 불량 LOT 유형(D12 절곡융착비전 · D14 절곡비전)을 추가한다. (근거: AS-IS 비고 SFR-005, 불량 유형은 SFR-015 · 025)" },
  { asIs: ["OC-AS-007"], change: "KEEP", method: "SYSTEM", sfr: [], summary: `${OUT} 절곡 품목도 기본 라우팅이 있어야 자재 장착 Template 이 생긴다. 자재차감 누락 이슈는 따로 확인한다.` },
  { asIs: ["OC-AS-008"], change: "KEEP", method: "PDA", sfr: [], summary: `${OUT} B/L 가입고 · 대표 라벨 + 후행 Lot 분할(안 B)은 자재입고 프로세스 의사결정에서 따로 다룬다.` },
  { asIs: ["OC-AS-009"], change: "KEEP", method: "PDA", sfr: [], summary: `${OUT} 불출 선입선출 인터락은 업무 정의 후 별도 과제로 둔다.` },
  { asIs: ["OC-AS-010"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-011"], change: "KEEP", method: "SYSTEM", sfr: [], summary: `${OUT} 계획 · 실적 누계 불일치는 따로 확인한다.` },
  { asIs: ["OC-AS-012"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-009", "INR-008"],
    summary: "ERP 작업지시를 조회해 절곡융착 · 절곡 MES 작업지시를 생성 · 확정한다. (근거: AS-IS 비고 SFR-009)" },
  { asIs: ["OC-AS-013"], change: "IMPROVE", method: "POP", priority: "MEDIUM", sfr: ["SFR-010"],
    summary: "절곡 호기(설비 8대)도 근무등록 대상에 넣고 작업지시 연동을 확인한다. (업무명 대응: SFR-010 호기별 근무등록)" },
  { asIs: ["OC-AS-014"], change: "IMPROVE", method: "PDA", priority: "MEDIUM", sfr: ["SFR-011"],
    summary: "절곡 작업지시에도 자재 장착을 적용한다. 작업시작(SFR-011)이 자재 장착을 확인하므로 같이 연결했다. (추정 연결)" },
  { asIs: ["OC-AS-015"], change: "IMPROVE", method: "PDA", priority: "HIGH", sfr: ["SFR-011"],
    summary: "절곡 작업시작 때 근무자 등록 · 작업지시 매칭 · 자재 장착을 확인한다. (업무명 대응: SFR-011 작업시작)" },
  { asIs: ["OC-AS-016"], change: "IMPROVE", method: "POP", priority: "HIGH", sfr: ["SFR-013", "SFR-028"],
    summary: "POP 수동 실적(LOT 생성 → 실적보고 → 불량)을 절곡융착(SFR-013) · 절곡(SFR-028)으로 넓힌다. (업무명 대응)" },
  {
    asIs: ["OC-AS-017"], change: "IMPROVE", method: "AUTO", priority: "HIGH", sfr: ["SFR-012", "SFR-027", "INR-001", "PER-001"],
    summary: "OPC TAG → QUEUE 자동 실적 방식을 절곡융착(SFR-012) · 절곡(SFR-027) 설비로 넓힌다. (근거: AS-IS 비고 SFR-012)",
    fixes: [{ issue: "설비 I/F 항목 · TAG 선정이 늦어 개발 지연", solution: "DIS 태그 1차 확정(10월 5주) 결과로 TAG 목록을 고정하고, 추가 TAG 는 변경 요청으로 관리한다." }],
  },
  { asIs: ["OC-AS-018"], change: "IMPROVE", method: "SYSTEM", priority: "MEDIUM", sfr: ["SFR-027", "SFR-032"],
    summary: "절곡 자동 실적에서 투입 LOT 을 확인해 절곡융착 → 절곡 LOT 계보를 잇고, RUN CARD 로 구성 트레이를 조회한다. 정 · 역방향 추적 화면 고도화는 범위 밖. (근거: AS-IS 비고 SFR-027)" },
  { asIs: ["OC-AS-019"], change: "KEEP", method: "SYSTEM", sfr: ["PER-003"],
    summary: "절곡 실적 · 불량은 기존 리포트에서 공정으로 함께 조회하는 것을 기본으로 한다(협의 필요). REPORT 고도화 요구 25건은 범위 밖." },
  {
    asIs: ["OC-AS-020"], change: "NEW", method: "AUTO", priority: "HIGH", sfr: ["DAR-001"],
    summary: "신규 절곡융착 4대 · 절곡 4대를 MES 관리 범위에 넣는다. 세부는 아래 신규 TO-BE(공정트레이 · SCAN IN · OUT · 혼입방지 인터락 · 라벨 · RUN CARD)와 기준정보 · 작업지시 · 실적 · 비전 TO-BE 에 나눠 연결했다.",
    fixes: [{ issue: "신규 절곡 8대가 MES 에 없어 작업지시 · 실적 · 불량 · 추적성 관리 불가", solution: "기준정보 · 작업지시 · 자동/수동 실적 · 비전 불량 · 인터락 · RUN CARD 를 MES 에서 관리한다." }],
  },
  { asIs: ["OC-AS-021"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-022"], change: "KEEP", method: "SYSTEM", sfr: [], summary: `${OUT} LOT 별 치수 · 성능검사 출하 인터락 요구는 별도 과제로 둔다.` },
  { asIs: ["OC-AS-023"], change: "IMPROVE", method: "POP", priority: "MEDIUM", sfr: ["SFR-033"],
    summary: "절곡 제품 외관검사의 대상 조회 · 결과 등록 · 이력 연결을 추가한다. 치수 입력 요구는 범위 밖. (업무명 대응: SFR-033 외관검사(품질))" },
  {
    asIs: ["OC-AS-024"], change: "IMPROVE", method: "AUTO", priority: "HIGH",
    sfr: ["SFR-014", "SFR-015", "SFR-016", "SFR-024", "SFR-025", "SFR-026", "INR-003", "INR-004", "DAR-002"],
    summary: "융착다열 비전 연계(LOTID 요청 → CSV · 이미지 업로드 → 불량 자동 등록)를 절곡융착비전(SFR-014~016) · 절곡비전(SFR-024~026)으로 넓힌다. (근거: AS-IS 비고 SFR-014~016)",
    fixes: [{ issue: "비전 프로그램이 멈춰도 알 수 없음(하트비트 없음)", solution: "비전 클라이언트 연결 관리(SFR-014 · 024)로 연결 상태를 감시한다." }],
  },
  { asIs: ["OC-AS-025"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-026"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-006", "SFR-007"],
    summary: "절곡융착 · 절곡 설비 8대와 설비 TAG 를 등록한다. (근거: AS-IS 비고 SFR-006, TAG 는 업무명 대응 SFR-007)" },
  { asIs: ["OC-AS-027"], change: "IMPROVE", method: "AUTO", priority: "HIGH", sfr: ["SFR-021", "SFR-022", "SFR-023", "INR-002", "INR-005"],
    summary: "절곡 설비 TAG 를 OPC 로 수집해 QUEUE 로 처리하고 TAG 이력을 조회한다. 표면처리 가동 이력 미수집 장애는 범위 밖. (업무명 대응)" },
  { asIs: ["OC-AS-028"], change: "KEEP", method: "SYSTEM", sfr: [], summary: `${OUT} (치공구는 V2.1 예정 항목)` },
  { asIs: ["OC-AS-029"], change: "KEEP", method: "MANUAL", sfr: [], summary: `${OUT} (FMB 실시간 모니터링은 V2.1 예정 항목) 절곡 혼입방지 인터락 모니터링은 따로 TO-BE 로 둔다.` },
  { asIs: ["OC-AS-030"], change: "KEEP", method: "PDA", sfr: [], summary: `${OUT} 절곡 반제품 위치 변경은 트레이 SCAN IN · OUT TO-BE 에서 다룬다.` },
  { asIs: ["OC-AS-031"], change: "KEEP", method: "PDA", sfr: [], summary: OUT },
  { asIs: ["OC-AS-032"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-033"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-034"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-035"], change: "KEEP", method: "PDA", sfr: [], summary: `${OUT} RUN CARD(SFR-030)는 절곡 라인 TO-BE 로 따로 둔다.` },
  { asIs: ["OC-AS-036"], change: "KEEP", method: "PDA", sfr: [], summary: `${OUT} 출하 선입선출 인터락은 업무 정의 후 별도 과제로 둔다.` },
  { asIs: ["OC-AS-037"], change: "KEEP", method: "SYSTEM", sfr: [], summary: OUT },
  { asIs: ["OC-AS-038"], change: "KEEP", method: "SYSTEM", sfr: ["COR-001", "COR-002"],
    summary: "서버 구성은 그대로 쓴다. 반영은 운영 무중단(COR-001)과 데이터베이스 환경(COR-002) 제약을 따른다." },
  { asIs: ["OC-AS-039"], change: "IMPROVE", method: "AUTO", priority: "MEDIUM", sfr: ["INR-005"],
    summary: "SCHEDULER(TAG QUEUE)와 SOCKET 비전 게이트웨이(현행 2열융착 한정)를 절곡 설비까지 넓힌다." },
  { asIs: ["OC-AS-040"], change: "IMPROVE", method: "POP", priority: "MEDIUM", sfr: ["QUR-001"],
    summary: "절곡 근무등록 · 작업시작 · 수동 실적 POP · PDA 화면을 현행 개발 표준(QUR-001)대로 추가한다." },
  { asIs: ["OC-AS-041"], change: "IMPROVE", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-034", "INR-008"],
    summary: "절곡 생산실적을 ERP 로 업로드하고 전송 상태 · 오류 재전송을 관리한다. (업무명 대응: SFR-034 ERP 생산실적 업로드)" },
  { asIs: ["OC-AS-042"], change: "KEEP", method: "SYSTEM", sfr: ["SER-001"],
    summary: "사용자 · 메뉴 · 권한 구조는 그대로 쓴다. 절곡 신규 화면은 권한 관리(SER-001)에 등록한다." },
  {
    asIs: ["OC-AS-043"], change: "IMPROVE", method: "MANUAL", priority: "MEDIUM",
    sfr: ["PMR-001", "PMR-002", "TER-001", "TER-002", "TER-003", "PSR-001", "PSR-002", "QUR-002", "SER-002", "COR-003", "COR-004"],
    summary: "프로젝트 수행 방식: 설비 I/F 확정 · 현업 협의 마감을 일정의 선행 조건으로 관리하고, 시험 · 교육 · 안정화 · 산출물 요구를 따른다.",
    fixes: [{ issue: "설비 I/F(TAG · 비전 프로토콜) 확정 지연, 현업 업무 미정의로 개발 연기 반복", solution: "설비 I/F 확정(DIS 태그) · 현업 업무 정의 마감을 WBS 선행 조건으로 두고 주간 보고에서 점검한다." }],
  },
];

/** 신규 절곡 라인 기능 (AS-IS 에 대응 업무가 없어 OC-AS-020 에 연결) */
export const NEW_FOR_BENDING: ToBeSeed[] = [
  { asIs: ["OC-AS-020"], after: "OC-AS-020", major: "MASTER", middle: "생산제조", task: "공정트레이 관리", change: "NEW", method: "SYSTEM", priority: "HIGH", sfr: ["SFR-002"],
    summary: "절곡 공정 트레이 마스터를 등록 · 조회한다. 트레이는 SCAN IN · OUT 과 RUN CARD 를 묶는 단위다. (업무명 대응)" },
  { asIs: ["OC-AS-020"], after: "OC-AS-020", major: "PRODUCTION", middle: "절곡 라인", task: "트레이 SCAN IN · OUT (절곡융착 · 절곡)", change: "NEW", method: "AUTO", priority: "HIGH",
    sfr: ["SFR-017", "SFR-018", "INR-009"], summary: "트레이 바코드 스캐너의 SCAN IN · OUT 을 받아 투입 트레이 확인 · 위치 변경 · 실적 연계를 한다. (업무명 대응)" },
  { asIs: ["OC-AS-020"], after: "OC-AS-020", major: "QUALITY", middle: "혼입방지", task: "혼입방지 인터락", change: "NEW", method: "AUTO", priority: "HIGH",
    sfr: ["SFR-019", "INR-006", "PER-002"], summary: "PLC 판정 요청에 MES 가 판정 결과를 돌려준다. 응답시간은 PER-002 를 따른다. (업무명 대응)" },
  { asIs: ["OC-AS-020"], after: "OC-AS-020", major: "EQUIPMENT", middle: "모니터링", task: "혼입방지 인터락 모니터링", change: "NEW", method: "SYSTEM", priority: "MEDIUM",
    sfr: ["SFR-020"], summary: "라인별 인터락 상태와 NG 를 화면에 표시하고 음성 · 메일 · 메신저로 알린다. (업무명 대응)" },
  { asIs: ["OC-AS-020"], after: "OC-AS-020", major: "PRODUCTION", middle: "절곡 라인", task: "절곡 Out Tray 라벨 발행", change: "NEW", method: "AUTO", priority: "MEDIUM",
    sfr: ["SFR-029", "INR-007"], summary: "자동 바코드 발행기로 절곡 Out Tray 라벨을 발행 · 재발행한다. (업무명 대응)" },
  { asIs: ["OC-AS-020", "OC-AS-035"], after: "OC-AS-020", major: "PRODUCTION", middle: "절곡 라인", task: "RUN CARD 관리 · 출력 · PDA 조회", change: "NEW", method: "SYSTEM", priority: "MEDIUM",
    sfr: ["SFR-030", "SFR-031", "SFR-032"], summary: "트레이 구성으로 RUN CARD 를 만들고 출력하며 PDA 로 스캔 조회한다. (근거: AS-IS OC-AS-035 비고 SFR-030)" },
];

/**
 * TO-BE 번호 → 구현 WBS 코드 (3단계 추적표). scripts/link-to-be-wbs-ochang.ts 가 WBS 코드로 찾아 연결한다 (DB id 를 쓰지 않아 운영에도 같은 값).
 * 기준(작성자 판단, 화면에서 고친다):
 * - 기준정보 SFR-001~008(제안요청서 개발범위 "선행" 항목) → 3.1 선진행 개발
 * - 화면(시스템 · POP · PDA) → 3.2 화면 개발, 실적 처리 · QUEUE · 인터락 → 3.3 서비스 개발, 설비 · ERP · 비전 · 라벨 · 스캐너 연계 → 3.4 외부 I/F 개발
 * - TAG 확정이 먼저인 자동 수집 → 2.4 요구 TAG 확정, 인터락 · 비전 규격 → 2.5 설비 업체 협의 ②
 * - 유지(KEEP)는 만들 기능이 없어 연결하지 않는다
 */
export const WBS_LINKS: Record<string, string[]> = {
  "TB-003": ["3.1"], "TB-004": ["3.1"], "TB-005": ["3.1"], "TB-006": ["3.1"],
  "TB-012": ["3.2", "3.4"],
  "TB-013": ["3.2"], "TB-014": ["3.2"], "TB-015": ["3.2"],
  "TB-016": ["3.2", "3.3"],
  "TB-017": ["2.4", "3.3", "3.4"],
  "TB-018": ["3.3"],
  "TB-020": ["2.4", "2.5"],
  "TB-023": ["3.2"],
  "TB-024": ["2.5", "3.3", "3.4"],
  "TB-026": ["3.1"],
  "TB-027": ["2.4", "3.3", "3.4"],
  "TB-039": ["3.3", "3.4"],
  "TB-040": ["3.2"],
  "TB-041": ["3.4"],
  "TB-043": ["4.1", "4.2", "4.3", "5.1", "5.2", "5.4", "6.1", "6.2"],
  "TB-044": ["3.1"],
  "TB-045": ["3.3", "3.4"],
  "TB-046": ["2.5", "3.3", "3.4"],
  "TB-047": ["3.2"],
  "TB-048": ["3.4"],
  "TB-049": ["3.2"],
};
