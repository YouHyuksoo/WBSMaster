---
standardVersion: 2
---

# Docs Manifest — 문서 표준 규정 (단일 출처)

이 파일은 이 프로젝트 `docs/`의 규정이다. AI/사람 구분 없이 docs 아래 문서를
생성·이동·삭제할 때 이 규정을 따른다. 관리 명령은 Claude `managing-docs` 스킬
(init/new/audit/sync/upgrade)이 제공하지만, 규정 자체는 도구 중립이다.

<!-- COMMON:START (upgrade가 이 블록만 교체한다 — 직접 수정 금지) -->

## 분류체계 (core 10)

| 폴더 | 용도 | 명명규칙 | 계층 |
|---|---|---|---|
| adr/ | 아키텍처 결정기록 | `NNNN-kebab-제목.md` | 기록형 |
| specs/ | 설계문서 (구현 전 의도) | `YYYY-MM-DD-주제-design.md` | 기록형 |
| plans/ | 구현계획 | `YYYY-MM-DD-주제.md` | 기록형 |
| standards/ | 코드·업무 규칙, 컨벤션, 절차 | `kebab-case.md` | 살아있음 |
| design/ | UI 디자인 시스템 (화면 공용화·표준화 규칙) | overview/theme/layout/buttons/data-grid/navigation/modals/forms.md | 살아있음 |
| database/ | 데이터 계층 문서 (스키마/ERD/컬럼 도메인/엔티티 설계) | `kebab-case.md` | 살아있음 |
| business-logics/ | 화면/기능 단위 로직·데이터 흐름 분석 (구현 후 실측) | `MENU_CODE.md` 또는 `kebab-case.md` | 살아있음 |
| guides/ | 설치·운영·사용 가이드 | `kebab-case.md` | 살아있음 |
| reports/ | 산출물·감사·미완료기록 | `YYYY-MM-DD-주제.md` 또는 주제 폴더 | 기록형 |
| sql/ | SQL·PL/SQL 원본 스냅샷 (DB 실행 아님) | `kebab-case.sql` (로컬 기존 규정 우선) | 기록형 |

## 공통 규칙

1. docs 루트에 md 파일 금지 (이 README 제외). 임시 문서는 docs가 아니라 작업 스크래치.
2. 아래 등록부에 없는 특화 폴더 생성 금지. 필요하면 등록부에 먼저 추가.
3. **살아있는 문서**(standards/design/database/business-logics/guides)는 frontmatter에
   `sources`(설명 대상 소스 경로 목록)와 `verifiedCommit`(마지막 대조 커밋)을 선언한다.
   소스가 바뀌면 문서도 동기화 대상이 된다 (`managing-docs sync`).
4. **기록형 문서**(adr/specs/plans/reports)는 작성 시점 기록이다 — 사후 수정하지 않는다.
5. 경계 판단: specs=구현 전 설계 / business-logics=구현 후 실측. standards=코드·절차 / design=화면 / database=데이터 구조 설명 / sql=SQL 원본 스냅샷.

<!-- COMMON:END -->

<!-- LOCAL:START (프로젝트 소유 — upgrade가 건드리지 않는다) -->

## 특화 폴더 등록부

| 폴더 | 용도 | 명명규칙 |
|---|---|---|

| obsidian/ | 프로젝트별 지식 노트 원본; 다른 프로젝트와 동일해도 독립 보존 (기록형) | 기존 파일명·하위 경로 보존 |
| _trash-candidates/ | 삭제하지 않은 정리 후보 및 이관 후 빈 폴더; 업무 원본 아님 | 기존 파일명·하위 경로 보존 |
| design/ | 공용 UI 규칙 및 프로젝트 기능별 보충 규칙 (살아있는 문서) | 정형 파일 + `list-page-style.md` |
## 외부 문서 집합 (위치를 앱이 결정하는 문서)

| 위치 | 용도 | 관리 규정 (audit 점검 명령 포함) |
|---|---|---|

| `public/docs/` | 웹 정적 배포 문서; 경로 보존 | 앱의 정적 경로 규칙 유지 |
## 프로젝트 참고사항

- WBSMaster 문서. 데이터·기록 원본을 보존하며 sources/verifiedCommit 미확인 값은 검증 완료를 의미하지 않는다.

<!-- LOCAL:END -->
