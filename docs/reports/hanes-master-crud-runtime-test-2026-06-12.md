# HANES 기준정보 CRUD 런타임 점검 리포트

- 실행일시: 2026-06-12 11:47 KST
- 대상 서버: `http://localhost:3003/api/v1`
- 테넌트: `X-Company=40`, `X-Plant=1000`
- 인증: `Bearer admin@hanes.com`
- 최종 테스트 stamp: `26061202474131`
- 원본 증거 JSON: `docs/reports/hanes-master-crud-runtime-test-26061202474131.json`
- 실행 도구: `tools/hanes-master-crud-runtime-test.mjs`

## 결론

기준정보 화면/API 기준 CRUD 실데이터 점검을 완료했다.

- API 단계: 101건 실행, 101건 성공, 0건 실패
- Cleanup 단계: 30건 실행, 30건 성공
- JSHANES DB 잔여 데이터 확인: 테스트 stamp `26061202474131` 기준 32개 관련 테이블 잔여 0건

## 점검 범위

| 구분 | 대상 | 결과 |
| --- | --- | --- |
| 공통 기준정보 | 공통코드, 거래처, 품목, 공정, 생산라인, 작업자 | 성공 |
| BOM/라우팅 | BOM, 라우팅그룹, 라우팅공정, 라우팅조건, 라우팅자재 | 성공 |
| 창고 | 창고, 창고위치, 창고이동규칙 | 성공 |
| 설비 | 설비, 공정-설비매핑, 설비BOM, 설비점검항목, 설비점검매핑 | 성공 |
| 품질 기준정보 | IQC 검사항목풀, IQC 품목검사, IQC 품목규격, 계측기 | 성공 |
| 라벨/작업 | 라벨템플릿, 작업지도서, 교대패턴, 작업달력 | 성공 |

## 최종 실행 요약

`node tools/hanes-master-crud-runtime-test.mjs`

```json
{
  "out": "docs/reports/hanes-master-crud-runtime-test-26061202474131.json",
  "total": 101,
  "passed": 101,
  "failed": 0,
  "cleanup": 30,
  "failures": 0,
  "error": null
}
```

## 오류 및 조치

실제 백엔드 결함은 최종적으로 확인되지 않았다. 초기 실패는 테스트 payload가 현재 DTO보다 넓거나 필드 타입이 맞지 않은 문제였다.

| 오류 | 원인 | 조치 |
| --- | --- | --- |
| 거래처 생성 400 | `businessNo`는 DTO 필드가 아님 | `bizNo`로 수정 |
| 생산라인 생성 400 | `oper` 최대 길이 10자 | 테스트 공정코드를 10자 이하로 단축 |
| IQC 검사항목풀 생성 400 | `revision`은 정수 | `revision: 1`로 수정 |
| IQC 품목규격 저장 400 | DTO 필드 불일치 | `sampleQty`, `isDest`, `judgeCriteria` 구조로 수정 |
| 설비점검매핑 생성 400 | 표시순서 필드명 불일치 | `sortSeq`로 수정 |
| 작업달력 생성 400 | `holidayApply`는 DTO 필드가 아님 | 필드 제거 |
| IQC 검사항목풀 cleanup 500 | 품목규격 세부항목 FK가 남아 있음 | `/master/iqc-part-specs/:itemCode` cleanup 추가 |

## DB 잔여 확인

Oracle 프로필 `JSHANES`로 테스트 stamp `26061202474131`이 남아 있는지 확인했다.

```json
{
  "site": "JSHANES",
  "stamp": "26061202474131",
  "nonzero": [],
  "table_count": 32
}
```

관련 테이블에는 최종 테스트 데이터가 남지 않았다.

## 산출물

- 실행 스크립트: `tools/hanes-master-crud-runtime-test.mjs`
- 최종 증거 JSON: `docs/reports/hanes-master-crud-runtime-test-26061202474131.json`
- 리포트: `docs/reports/hanes-master-crud-runtime-test-2026-06-12.md`
