# TO-BE 설계 기능 설계안

- 작성일: 2026-11-10
- 상태: 승인(2026-11-10, "그대로 좋아"). 1단계 구현 완료 — 데이터 모델 · API · 총괄표 · AS-IS에서 초안 만들기 · 메뉴 등록 (마이그레이션 20261110200000_to_be_design). 2단계 구현 완료 — 단위업무 설계 화면(개요 · 개선 매핑 · 흐름 비교 · 프로세스 정의 · SFR 진행) (마이그레이션 20261110230000_to_be_unit_design)
- 대상: WBSMaster `행성오창V2` (폴 오창 MES 고도화 · 절곡공정 추가)

## 1. 왜 필요한가

- AS-IS 분석(`/dashboard/as-is-analysis`)은 있다: 총괄표 1개(단위업무 43건, 대분류 8종) + 단위업무별 상세 분석 10개 표 · Flow Chart · Swimlane.
- TO-BE 는 화면도 데이터도 없다. 지금은 TO-BE 가 흩어져 있다:
  - 기능추적표(업무기능추적표)의 `TO-BE 관리번호`(= 제안요청서 SFR 번호, 267행)
  - 인터뷰의 "원하는 결과(TO-BE)" 칸
  - WBS 1.11 "TO-BE 산출" 작업
- 그래서 "현행 업무 하나가 앞으로 어떻게 바뀌고, 어떤 기능으로 구현되며, 현행 문제점이 해결되는지"를 한 곳에서 볼 수 없다.

## 2. 목표 · 비목표 · 실패 조건

목표
1. 현행 업무(AS-IS) 각각에 대해 미래 업무(TO-BE)를 정의하고 1:N · N:1 로 연결한다.
2. AS-IS 와 같은 형식(총괄표 + 단위업무 설계)으로 TO-BE 를 작성해, 현업 · 개발자가 같은 눈높이로 읽는다.
3. 차이(Gap)를 한눈에 본다: TO-BE 가 없는 AS-IS 업무, 해결 안 된 AS-IS 문제점, 기능(SFR)으로 이어지지 않은 TO-BE 업무.
4. TO-BE 업무 → 기능추적표(SFR) → WBS 로 추적이 이어진다.

비목표 (이번 범위 아님)
- 화면 설계서 · 테이블 정의서 같은 개발 산출물 작성 도구
- 다중 사업부 (2026-11-09 제거 방침 유지: 프로젝트당 총괄 하나)
- 승인 결재 흐름

실패 조건 (동작해도 실패로 본다)
- AS-IS 를 복사만 해 두고 무엇이 바뀌는지 보이지 않는 경우
- AS-IS · 기능추적표와 연결이 끊긴 별도 문서가 되는 경우
- 입력 칸이 너무 많아 아무도 채우지 않는 경우 → 총괄표는 핵심 칸만, 상세는 선택

## 3. 화면 구성 (작성자 판단)

메뉴: 단독 메뉴 `AS-IS 분석` 바로 아래 `TO-BE 설계` (메뉴 코드 `TO_BE`, 주소 `/dashboard/to-be`).

```
┌ TO-BE 설계 ─────────────────────────────────────────────────────────┐
│ [총괄표] [Gap 분석] [추적표]                        [AS-IS에서 초안 만들기] │
├──────────────┬──────────────────────────────────────────────────────┤
│ 업무 목록     │ 선택한 TO-BE 단위업무                                  │
│ (대분류>중분류)│  ① 개요: 변화 유형 · 목표 방식 · 연결 AS-IS · 연결 SFR   │
│ 검색 · 필터   │  ② 개선 매핑: AS-IS 문제점 → 해결 방안 (해결/부분/미해결) │
│ Gap 배지      │  ③ TO-BE 흐름 (Flow Chart / Swimlane, AS-IS 와 나란히)  │
│              │  ④ 프로세스 정의 · R&R (AS-IS 와 같은 표 형식)          │
│              │  ⑤ 구현 기능: 기능추적표 SFR 행 연결 · 진행 상태         │
└──────────────┴──────────────────────────────────────────────────────┘
```

- 총괄표 탭: AS-IS 총괄표와 같은 공용 그리드(`WbsDataGrid`). 칸: TO-BE 관리번호 · 대분류 · 중분류 · 업무명 · 변화 유형 · 목표 방식 · 연결 AS-IS · 연결 SFR · 개선 요약 · 우선순위 · 상태.
- Gap 분석 탭: 세 목록
  1. TO-BE 가 없는 AS-IS 업무 (43건 중 몇 건)
  2. 해결 방안이 없는 AS-IS 문제점(AsIsIssue)
  3. SFR 연결이 없는 TO-BE 업무
- 추적표 탭: AS-IS → TO-BE → SFR(기능추적표) → WBS 한 줄 추적, 엑셀 다운로드.

## 4. 데이터 모델 (작성자 판단)

AS-IS 와 짝을 이루되 칸을 줄인다. 프로젝트당 총괄 하나 (`projectId` 유일).

```prisma
model ToBeOverview {            // 프로젝트당 1개 (AS-IS 총괄과 같은 위치)
  id, projectId @unique, author?, createdAt, updatedAt
  items ToBeItem[]
}

model ToBeItem {                // TO-BE 단위업무
  id
  toBeManagementNo String       // TB-001 (자동 부여, 프로젝트 안에서 유일)
  majorCategory   AsIsMajorCategory  // AS-IS 와 같은 대분류 Enum 재사용
  middleCategory  String
  taskName        String
  changeType      ToBeChangeType     // NEW 신규 · IMPROVE 개선 · KEEP 유지 · RETIRE 폐지
  targetMethod    ToBeTargetMethod   // SYSTEM 시스템 · AUTO 자동(설비 연계) · POP · PDA · MANUAL 수기 유지
  summary         String?            // 개선 요약 (무엇이 달라지는가 한두 줄)
  priority        String?            // HIGH · MEDIUM · LOW
  status          ToBeStatus         // DRAFT 작성중 · REVIEW 협의중 · CONFIRMED 확정
  order Int
  flowChartData Json?  swimlaneData Json?   // TO-BE 흐름 (AS-IS 캔버스 재사용)
  asIsLinks   ToBeAsIsLink[]        // 연결된 AS-IS 업무 (N:M)
  fixes       ToBeIssueFix[]        // AS-IS 문제점 해결 매핑
  sfrCodes    String[]              // 연결 SFR (기능추적표 toBeCode 와 같은 값, 예: SFR-012)
  processes   ToBeProcess[]         // 프로세스 정의 (단계 · 담당 · 시스템 · 입출력)
  overviewId
}

model ToBeAsIsLink { toBeItemId, asIsItemId, @@id([toBeItemId, asIsItemId]) }

model ToBeIssueFix {            // AS-IS 문제점 → TO-BE 해결
  id, toBeItemId, asIsIssueId?, issueTitle String   // 문제점이 AS-IS 상세에 없으면 제목만
  solution String, result FixResult                 // RESOLVED 해결 · PARTIAL 부분 · OPEN 미해결
}

model ToBeProcess { id, toBeItemId, step Int, name, owner?, system?, input?, output?, remarks? }
```

- SFR 연결은 기능추적표 `ProcessVerificationMaster.toBeCode` 와 같은 문자열을 쓴다 → 별도 FK 없이 코드로 조회(기능추적표는 제품유형 · 사업부 구조라 FK 를 걸면 결합이 커진다).
- R&R 은 1차에 넣지 않고 프로세스 정의의 `owner` 로 대신한다 (칸 줄이기).

## 5. 핵심 동작

1. AS-IS 에서 초안 만들기: AS-IS 총괄 43건을 그대로 TO-BE 항목으로 복사(변화 유형=IMPROVE, 상태=DRAFT, AS-IS 1:1 연결). 이미 있는 항목은 건너뛴다(재실행 안전).
2. SFR 자동 제안: 제안요청서 기능추적표(LEADTAB 267행)의 L2 · 업무명과 TO-BE 업무명을 비교해 연결 후보를 보여 주고, 사용자가 고른다. (1차는 이름 포함 검색, AI 제안은 4단계)
3. Gap 계산: 서버에서 집계 (TO-BE 없는 AS-IS · 미해결 문제점 · SFR 없는 TO-BE 건수와 목록).
4. 지식관리 연동: 새 테이블을 지식 전송 대상(whitelist)에 넣어 AI 채팅이 "절곡 실적 TO-BE 가 뭐야?"에 답하게 한다.
5. 권한: 프로젝트 멤버는 읽기 · 쓰기 (AS-IS 와 같은 `assertProjectAccess`), 메뉴는 메뉴 관리 · 권한 관리에 등록.

## 6. 단계 (작성자 판단)

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| 1 | 데이터 모델 · API · 총괄표 탭 · AS-IS에서 초안 만들기 · 메뉴 등록 | 43건 초안 생성, 총괄표에서 수정 · 삭제 |
| 2 | 단위업무 설계(개요 · 개선 매핑 · 프로세스 정의) · TO-BE 흐름 캔버스(AS-IS 와 나란히) | 한 업무를 끝까지 작성 |
| 3 | Gap 분석 탭 · 추적표 탭(AS-IS→TO-BE→SFR→WBS) · 엑셀 | 세 Gap 목록과 추적표 |
| 4 | SFR · 인터뷰 "원하는 결과" 기반 AI 초안 제안, 지식관리 연동 | 채팅에서 TO-BE 질의 응답 |

## 7. 제약 · 지켜야 할 것

- 운영 배포는 DB 구조를 바꾸지 않으므로 새 테이블 마이그레이션은 배포 전에 운영 DB 에 먼저 적용한다 (AGENTS.md).
- 화면 규칙: `DESIGN.md` · `docs/design/list-page-style.md`, 공용 그리드 · 모달, 파스텔 금지, 다크 높이 단계.
- 새 화면은 `src/lib/menu/menu-config.ts` 등록 + 배치 · 권한 SQL 동반.
- 파일 구조: `src/app/dashboard/to-be/` = `page.tsx`(조합) + `components/` + `hooks/` + `types.ts`.

## 8. 빌더에게 맡기는 것

- 칸 순서 · 너비, 배지 색, 빈 화면 문구
- TO-BE 관리번호 채번 규칙 세부(TB-001 형식만 고정)
- 흐름 캔버스에서 AS-IS 노드를 복사해 오는 방식

## 9. 사용자 확인이 필요한 것

1. 변화 유형 4종(신규 · 개선 · 유지 · 폐지)과 목표 방식 5종(시스템 · 자동 · POP · PDA · 수기)이 현장 용어와 맞는가
2. TO-BE 단위를 AS-IS 단위업무와 같게 둘 것인가, 아니면 SFR(기능) 단위로 둘 것인가 — 본안은 "업무 단위 + SFR 연결"
3. 1단계 범위(총괄표 + 초안 만들기)부터 시작해도 되는가
