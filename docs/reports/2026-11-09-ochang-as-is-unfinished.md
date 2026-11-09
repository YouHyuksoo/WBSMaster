# 오창 MES 현행(AS-IS) 입력 — 미완료 기록

- 작성일: 2026-11-09
- 작성 계기: 행성사 오창(구 폴오창) MES 현재 상태를 AS-IS 분석에 입력. DB 입력·배포는 끝났으나 운영 화면 확인이 남음
- 갱신: 2026-11-09 — 사업부 POLE 고정 코드(be4eedf)가 운영(4faa4cf)에 배포됨을 git 이력으로 확인

## 요약 (결론 먼저)

AS-IS 총괄 43건을 프로젝트 `행성오창V2`, 사업부 `POLE` 로 로컬·운영 DB 양쪽에 넣고 재조회로 확인했다.
화면이 사업부를 POLE 로 고정하는 코드(be4eedf)는 운영 배포본(4faa4cf)에 들어 있다. 남은 일은 운영 화면에서 43건이 보이는지 눈으로 확인하는 것뿐이다.

## 상세

| 항목 | 상태 |
|---|---|
| 로컬 DB (127.0.0.1:55432/wbsmaster) 입력 | 완료 — POLE 43건 재조회 확인 |
| 운영 DB (jisung-idc, 서버 로컬 5432/wbsmaster) 입력 | 완료 — POLE 43건 재조회 확인, 서버 임시 폴더 `.tmp-ochang` 삭제 |
| POLE 사업부 화면 반영 | 완료 — be4eedf(사업부 관리 제거, DB 기본값 POLE)가 운영 배포본 4faa4cf 에 포함 |
| 화면 확인 | 안 함 — 운영 화면에서 43건 표시 여부를 아직 눈으로 보지 않음 |
| 스크립트 커밋 | 완료 — 2cc6ec0(push 됨): `scripts/import-as-is-ochang.ts`, `scripts/as-is-ochang-sources.ts`, `scripts/as-is-ochang-items.ts`, `scripts/as-is-ochang-items-2.ts` |

- 입력 대분류별 건수: 기준 7·자재 3·생산 10·품질 5·설비 4·재고 4·출하 4·기타 6.
- 다시 넣기: `REPLACE=1 BUSINESS_UNIT=POLE npx tsx scripts/import-as-is-ochang.ts` (항목에 연결된 단위업무 분석도 함께 지워짐).

## 재개 시 확인

1. https://wbs.jisheng.co.kr AS-IS 분석에서 행성오창V2 를 고르고 43건이 보이는지 확인. 확인되면 이 기록을 완료로 바꾼다.
2. 재개 전 운영 DB 건수를 다시 조회해 43건 그대로인지 확인 (현황 조회는 `BUSINESS_UNIT` 없이 실행하면 쓰기 없음).
