/**
 * @file scripts/as-is-ochang-items-2.ts
 * @description
 * 행성사 오창(구 폴오창) MES V2 AS-IS 총괄 항목 중 품질·설비·재고·출하·기타 항목입니다.
 *
 * 초보자 가이드:
 * - as-is-ochang-items.ts 가 이 목록을 기준·자재·생산 항목 뒤에 이어 붙입니다.
 * - 작성 기준(현재 상태만, LIST 요청은 반영 여부 미확인 표기 등)은 as-is-ochang-items.ts 상단 설명과 같습니다.
 */

import { type OchangAsIsItem, MANUAL_0, MANUAL_3, MANUAL_4, POP, RFP, LIST, MAIL_ISSUE, UNCHECKED } from "./as-is-ochang-sources";

export const SUPPORT_ITEMS: OchangAsIsItem[] = [
  // ───────────── 품질관리 ─────────────
  {
    major: "QUALITY", middle: "공정검사", task: "공정검사 등록", method: "SYSTEM",
    details: "검사/생산 일자·공정으로 공정검사 현황 조회(제품 Type 별)\n초·중·종단 샘플 라벨 발행, 공정검사 성적서 등록·조회",
    remarks: MANUAL_4,
  },
  {
    major: "QUALITY", middle: "출하검사", task: "출하검사(COA) 등록·성적서 의뢰", method: "SYSTEM",
    issue: "LOT 별 치수·성능검사 결과 입력과 합격 시에만 출하 인터락 요구 이력, 고객별(넥스포·추저우) 성적서 양식 요청",
    details:
      "출하검사 등록: 제품 Type 별 현황, 성적서 등록(검사일·성적서 번호·종합판정 표시)\n출하성적서 의뢰 현황: 공정(표면처리/융착)·포장 ID 별 의뢰·발행 번호, 성적서 출력\n출하검사 성적서가 출력돼야 출하 가능",
    remarks: `${MANUAL_4}; ${LIST} #46·#47·#62, 기능 #32(${UNCHECKED})`,
  },
  {
    major: "QUALITY", middle: "외관검사", task: "외관검사(POP 외관보고)", method: "SYSTEM",
    issue: "외관 항목만 검사 가능 — 치수 입력 항목·LOT 별 치수 검사 결과 기입 요구 이력",
    details: "작업지시 선택 → 검사 대기 LOT 선택 → 양품보고 / 불량보고(불량코드 복수 선택·수량)\nQ50 으로 재고 인수한 LOT 만 표시, 근무등록 필수",
    remarks: `${POP}; ${LIST} #58, REPORT #19(${UNCHECKED})`,
  },
  {
    major: "QUALITY", middle: "비전검사", task: "융착다열 비전 치수검사(CSV·이미지)", method: "SYSTEM",
    issue: "비전 프로그램에 부가 기능이 섞여 최적화 안 됨, 멈춰도 알 수 없음(하트비트 없음). 실적 없는 검사파일 처리 로직 수정 이력",
    details:
      "비전 PC 가 설비·열·현재 LOTID 를 약 15초 주기로 요청(SOCKET, VS003/MA031 규칙)\nLOTID 로 치수 CSV·검사 이미지 저장 → FTP → NAS(HITACHI) X:/VISION/SIZE/레인/YYMMDD (파일명 예 260923A9201-04-T.csv)\nCSV 불량 행은 D4 불량실적 자동 등록, LOT 첨부 → '09_비전치수검사' 메뉴로 조회·다운로드\n보존: 양품 4개월·불량 2년\nSOCKET 게이트웨이는 현행 2열융착 비전 한정",
    remarks: `${RFP} SFR-014~016·2.시스템 현황; 이슈는 ${MAIL_ISSUE} 고도화 14주차, 구축 22~28주차(비전 프로토콜·연동 지연)`,
  },
  {
    major: "QUALITY", middle: "QMS", task: "QMS(IQC·LQC·OQC)·SPC", method: "SYSTEM",
    issue: "LOT 단위 합격, 문서 상신 후 수정·취소, 불량 PPM·SPC·CPK 모니터링 요구 이력",
    details:
      "QMS 서버(Apache Tomcat 9·Redis 세션·JRE 1.8), MES 와 동일 DB 로 IQC/LQC/OQC 판정·부적합 관리\n수입검사, X-BAR R 관리도, 성적서·기준서 문서 상신",
    remarks: `${RFP} 2.시스템 현황; ${LIST} QMS #9·#10·#60·#61, REPORT #6~#12(${UNCHECKED})`,
  },

  // ───────────── 설비관리 ─────────────
  {
    major: "EQUIPMENT", middle: "설비 기준", task: "설비등록·TAG·알람·Recipe 관리", method: "SYSTEM",
    details:
      "설비등록: 설비 그룹별 설비 등록, 설비 Port 목록·라벨 인쇄(설비 Lane 은 매뉴얼 시점 MES 에서 추가 불가)\n설비 4구획 입력(외관검사 = 반제품 투입 PORT 구성 등)\nTAG 관리·TAG 알람 정의, 알람 설정(PLC 알람 그룹·정의), Recipe 항목·Recipe 값 관리",
    remarks: `${MANUAL_0}, ${RFP} SFR-006 참고`,
  },
  {
    major: "EQUIPMENT", middle: "설비 데이터", task: "설비 TAG 수집·설비 이력", method: "SYSTEM",
    issue: "표면처리 설비가동 이력이 2025-12-29 부터 수집 안 됨(A15~A18 삭제 후 장애 추정, DIS 대응)",
    details:
      "OPC 서버가 PLC 전체 태그를 크롤링, APP 서버는 지정 태그만 수집\nOPC 서버 필수: HawkEyesDAS(읽기)·HawkEyesDAS_WRITE(쓰기) 실행\n설비 I/F 업체: DIS(디아이에스)\n설비 이력 현황: 설비·TAG 그룹·기간별 TAG 값·그래프·생산 LOT 조회(호기/열 필수 조건 삭제 요청 이력)",
    remarks: `구성도(2025-05-21), 필수기능 체크리스트(2025-02-04), ${MANUAL_3}; 이슈는 ${MAIL_ISSUE} 고도화 19주차(원문 '2026.12.29'는 2025 오기 추정)`,
  },
  {
    major: "EQUIPMENT", middle: "치공구", task: "치공구 코드·Spare Part·치공구 BOM·장착", method: "MIXED",
    issue: "치공구 코드·Spare Part·BOM 은 매뉴얼 기준 V2.1 예정(미개발), 치공구 장착은 UI 만",
    details:
      "치공구 장착: 공정(융착/표면처리/엣지)·라인·설비별 장착/탈착, 수명관리(현장 PDA/POP 는 향후 예정)\n치공구 코드·Spare Part·치공구 BOM: 2025-01 매뉴얼 기준 협의 후 개발 예정",
    remarks: `${MANUAL_0}, ${MANUAL_3}; 이후 반영 여부 미확인`,
  },
  {
    major: "EQUIPMENT", middle: "모니터링", task: "FMB 공정 실시간 모니터링", method: "MANUAL",
    issue: "공정 실시간 모니터링은 매뉴얼 기준 V2.1 예정, 생산모니터링 데이터 추가·알람 현황 조회 요구 이력",
    details: "FMB 공정 실시간 모니터링: 2025-01 매뉴얼 기준 협의 후 개발 예정",
    remarks: `MES 매뉴얼 8.모니터링(2025-01-09); ${LIST} #41(${UNCHECKED})`,
  },

  // ───────────── 재고관리 ─────────────
  {
    major: "INVENTORY", middle: "재고이동", task: "재고이동·인수(부서 간)", method: "SYSTEM",
    details:
      "PDA 재고이동, 타부서 이동 시 인수 전까지 인계창고 재고로 유지\n재고이동내역·수불현황·일자별입출고·자재재고현황은 재고인수 기준\n부서 내 창고 조회 기준·타부서 인수 인터락·Q70→W50 이동 제한 해제 요청 이력",
    remarks: `${LIST} #14·#19~#23·#50·#51·#59(${UNCHECKED})`,
  },
  {
    major: "INVENTORY", middle: "재고조정", task: "재고실사·재고보정·자재폐기", method: "SYSTEM",
    details: "재고실사 스냅샷(재고 0 포함 요청), PDA 재고실사(BOX·PALLET 포함 요청)\n재고보정(부서 내 창고만, LOT 상태 조건 확대 요청)\n자재폐기(폐기 사유 항목 추가 요청)",
    remarks: `${LIST} #1·#15·#17·#28·#29(${UNCHECKED})`,
  },
  {
    major: "INVENTORY", middle: "물류", task: "Rack 관리", method: "SYSTEM",
    details: "창고별 Rack 목록 추가·라벨 인쇄, Rack 별 적재 품목 설정",
    remarks: MANUAL_0,
  },
  {
    major: "INVENTORY", middle: "재고조회", task: "재고 리포트(품목별 재고·수불·입출고)", method: "SYSTEM",
    issue: "장기·불용 재고 구분, 업체 LOT·LOT 조회 조건, 부서별 창고 조회 요구 이력",
    details: "품목별재고현황, 자재 재고 현황, 수불현황, 일자별 입출고 현황, 재고이동내역, 입고 현황, PDA 재고조회",
    remarks: `구성도(2025-05-21); ${LIST} #31·#32·#53·#55, REPORT #1~#3·#25(${UNCHECKED})`,
  },

  // ───────────── 출하관리 ─────────────
  {
    major: "SHIPMENT", middle: "수주", task: "수주 현황", method: "SYSTEM",
    details: "ERP 수주 기준 수주 목록·출하실적 조회(목록 중복 표시 개선, 상태값 무관 표시 요청 이력)",
    remarks: `${LIST} #5·#24·#25(${UNCHECKED})`,
  },
  {
    major: "SHIPMENT", middle: "포장", task: "포장(소BOX·BOX·PALLET)", method: "SYSTEM",
    details: "소BOX 포장(고객사 정보 추가 요청), BOX 해제(반품·포장 완료 BOX), 포장 재고 조회\n출하 공정은 Rack 관리·소포장 개념으로 운영",
    remarks: `${LIST} #3·#44, REPORT #7(${UNCHECKED}), ${RFP} SFR-030`,
  },
  {
    major: "SHIPMENT", middle: "출하", task: "출하처리(PDA)·출하 현황", method: "SYSTEM",
    issue: "출하 선입선출 인터락 업무 미정의로 개발 지연",
    details:
      "PDA 출하처리: 수주 잔량 표시, 수주 잔량 > 출하수량 인터락(요청 이력)\n출하검사 성적서 출력 후 출하 가능\n출하 현황: LOT 기준 BOX·PALLET 조회 요청 이력",
    remarks: `${MANUAL_4}; ${MAIL_ISSUE} 고도화 10·11주차; ${LIST} #7·#16(${UNCHECKED})`,
  },
  {
    major: "SHIPMENT", middle: "반품", task: "출하 반품", method: "SYSTEM",
    details: "출하 반품 처리, LOT 단위·일부 수량 반품, 반품 LOT 포장 해제·재포장 요청 이력",
    remarks: `${LIST} #2·#30(${UNCHECKED})`,
  },

  // ───────────── 기타 ─────────────
  {
    major: "OTHER", middle: "시스템 구성", task: "MES 서버·하드웨어 구성", method: "SYSTEM",
    details:
      "시스템: 폴(오창) MES V2(제작사 THiRA-UTECH), 최초 구축 2024-12, 최근 고도화 2026-04(운영 DB PL2MESV2)\n관리 공정: 자재입고/IQC → Slitting(외주) → Edge(외주) → 표면처리 → 융착 → 외관검사 → 포장/출하\nDB 2대: DellEMC R750xs·Linux·Oracle 19c SE2, MES/QMS 공용, Active-Standby, 약 817GB\nAPP 1대: Windows Server 2019·Xeon Gold 5217·RAM 32GB(WAS·SCHEDULER·SOCKET·SENDMAIL), 리포트(RPS)는 같은 장비\nQMS 1대, OPC 서버, NAS(HITACHI)",
    remarks: `${RFP} 2.시스템 현황, 구성도(2025-05-21)`,
  },
  {
    major: "OTHER", middle: "시스템 구성", task: "응용 모듈(WAS·SCHEDULER·SOCKET·SENDMAIL·RPS)", method: "SYSTEM",
    issue: "모듈 프로그램(RPS·비전통신 등)·비전 불량 수신 모니터링 화면 요구 이력",
    details:
      "WAS: 업무 API(UI·POP·PDA 공통 진입점), .NET 5 THiRAMES.APP.WAS(Visual Studio 2019 빌드), 웹 프론트 HTML&JS(wwwroot)\nSCHEDULER: OPC TAG 수집 → PLC_TAG → PLC_QUEUE 적재·소비, 야간 배치·알림\nSOCKET: 비전 소켓 게이트웨이(생산량 보고·시리얼 채번·자재장착·TRAY OUT)\nSENDMAIL: 배치 결과·이상 알림, RPS: 라벨·성적서 출력(HTTP)\nAPP 서버 필수: FTP·OPC·CSV·SENDMAIL·RPS 모듈 13종 실행, CSV 처리 후 NAS 이동 네트워크 연결\n모듈 하트비트: 신고 10분·판정 15분, 모듈 상태 화면",
    remarks: `${RFP} 2.시스템 현황, 필수기능 체크리스트(2025-02-04), WAS 배포 문서(2025-03-21); ${LIST} 기능 #23·#24(${UNCHECKED})`,
  },
  {
    major: "OTHER", middle: "클라이언트", task: "관리자 UI·POP·PDA", method: "SYSTEM",
    details:
      "관리자 UI(웹): 기준정보·계획·조회, 위젯관리(현황 프론트)·사용자쿼리(현황 백엔드) 구조\nPOP(판넬PC): 호기별 근무등록·생산보고·외관보고\nPDA: Flutter/Android, 현재 Zebra 단말(Point Mobile 멀티 모델 적용 요구 이력) — 재고입고·자재불출·작업시작·재고이동·실사·출하",
    remarks: `구성도(2025-05-21), 김산 메일 PDA 소스 전달(2026-10-20); ${LIST} 기능 #13(${UNCHECKED})`,
  },
  {
    major: "OTHER", middle: "외부 연계", task: "ERP I/F(Oracle ERP)", method: "SYSTEM",
    issue: "실적취소→실적반품·자재리턴 I/F, ERP I/F 모니터링 화면, 기준정보 변경 메일링 요구 이력",
    details:
      "I/F 테이블 방식: 품목·거래처·BOM·생산지시(PO)·사업장·위치·단위 수신, 생산실적·입출고 실적 송신\nWORKCALENDAR 기준으로 실적 시간 귀속, 공정별 업로드 설정\n오류 시 ERP I/F 오류 알림 메일, 실패 건 재처리",
    remarks: `${RFP} 2.시스템 현황·4-5 인터페이스; ${LIST} #34·#35, 기능 #22·#25(${UNCHECKED})`,
  },
  {
    major: "OTHER", middle: "공통", task: "사용자·메뉴·권한·개발 표준", method: "SYSTEM",
    issue: "홀딩 권한(설비: 생산·생기 / 자재: 품질)·메뉴 권한 수정 권한 세분화 요구 이력",
    details:
      "사용자 관리·메뉴 관리·메뉴 버튼 관리·메뉴 권한 그룹·다국어 관리\n개발 표준: Hybrid MES Dev Guide, GitLab·SourceTree, Widget·Filter·POPUP·Splitter, Service 구조·호출·개발·배포\n게시판·메뉴별 문서관리",
    remarks: `티라유텍 개발 가이드 PDF 001~017(2026-10-20 수신), ${MANUAL_0}; ${LIST} #57, 기능 #17(${UNCHECKED})`,
  },
  {
    major: "OTHER", middle: "프로젝트 이력", task: "이전 프로젝트 이슈·협업 방식", method: "MIXED",
    issue: "반복 패턴: 설비 I/F(TAG·비전 프로토콜) 확정 지연, 현업 업무 미정의로 개발 연기",
    details:
      "MES V2 구축: 2024.04~2025.01(10개월) — MES 신규, QMS 일부 업그레이드, OPC 신규\nMES V2 고도화: 2025.09~2026.03(7개월) — MES·OPC·QMS 기능 개선\n개선 요청: 현업 협의 항목은 개발 일정 1주 전까지 협의 완료\n협업: 팀즈 실시간 대화, 주간·중간·완료 보고, 검수 3단계(개발자 → TF팀 → 정보전략팀), 회의록은 TF팀 작성·공유\n주차 요일 기준을 TF팀·정보전략팀이 통일(2025-12-29)\n개발업체 접근: 접근제어(SecureGuard)·VPN 계정 발급 필요",
    remarks: `${MAIL_ISSUE}(원문 고도화 기간 '2026.09~2026.03'은 2025 오기 추정), 접근제어 매뉴얼(2026-10-20 수신)`,
  },
];
