# HANES IQC 시리얼 3개 실데이터 테스트 기록

- 실행일시: 2026-06-12 12:19 KST
- 실행 스크립트: `tools/hanes-iqc-serial3-runtime-test.mjs`
- 실행 증거 JSON: `docs/reports/hanes-iqc-serial3-runtime-test-26061203191605.json`
- API 서버: `http://localhost:3003/api/v1`
- 회사/공장: `40` / `1000`
- DB 사이트: `JSHANES`

## 목적

수입검사(IQC) 절차대로 구매발주 생성부터 입하, 시리얼 3개 생성, IQC PASS 판정, 검사성적서 업로드, PDA 입고 가능 확인, 자재입고, 재고 반영까지 실제 API와 JSHANES DB로 검증했다.

## 테스트 데이터

| 구분 | 값 |
| --- | --- |
| 구매발주번호 | `PO-IQC3-26061203191605` |
| 입하번호 | `R26061200008` |
| 입고번호 | `RCV20260612-0007` |
| 품목 | `HSG0001` / 하우징 |
| 발주/입하 수량 | `60` |
| LOT 단위 수량 | `20` |
| 생성 시리얼 | `VH1-RM260612-00017`, `VH1-RM260612-00018`, `VH1-RM260612-00019` |
| 입하 창고 | `W001` |
| 최종 입고 창고 | `RM_MAIN` |
| 공급처 | `VND-001` / 한국단자공업 |
| 제조사 | `M001` |

`HSG0001`은 `IQC_FLAG=Y`, `INSPECT_METHOD=FULL`, `LOT_UNIT_QTY=20`인 원자재다. JSHANES 기준 `LOT_UNIT_QTY=1`인 IQC 대상 원자재가 없어, 수량 `60`으로 입하하여 20개 단위 시리얼 3개를 생성했다.

## API 실행 결과

전체 17단계 중 17단계 성공, 실패 0건.

| 순서 | 단계 | HTTP | 결과 |
| ---: | --- | ---: | --- |
| 1 | 서버/DB health 확인 | 200 | 성공 |
| 2 | 구매발주 생성 | 201 | 성공 |
| 3 | 구매발주 확정 | 200 | 성공 |
| 4 | PO 라인 입하 및 시리얼 3개 생성 | 201 | 성공 |
| 5 | IQC 대기 입하 목록 확인 | 200 | 성공 |
| 6 | IQC 대기 시리얼 3개 확인 | 200 | 성공 |
| 7 | IQC 입하단위 PASS 판정 | 201 | 성공 |
| 8 | IQC 후 입하실적 시리얼 PASS 확인 | 200 | 성공 |
| 9 | 검사성적서 업로드 | 200 | 성공 |
| 10 | 입고 가능 시리얼 확인 `VH1-RM260612-00017` | 200 | 성공 |
| 11 | 입고 가능 시리얼 확인 `VH1-RM260612-00018` | 200 | 성공 |
| 12 | 입고 가능 시리얼 확인 `VH1-RM260612-00019` | 200 | 성공 |
| 13 | 시리얼 3개 일괄 입고 처리 | 201 | 성공 |
| 14 | 입고 이력 조회 확인 | 200 | 성공 |
| 15 | 입고 재고 확인 `VH1-RM260612-00017` | 200 | 성공 |
| 16 | 입고 재고 확인 `VH1-RM260612-00018` | 200 | 성공 |
| 17 | 입고 재고 확인 `VH1-RM260612-00019` | 200 | 성공 |

## JSHANES DB 확인

| 테이블 | 확인 결과 |
| --- | --- |
| `PURCHASE_ORDERS` | `PO-IQC3-26061203191605` 1건, `STATUS=CONFIRMED`, `PARTNER_ID=VND-001` |
| `PURCHASE_ORDER_ITEMS` | `HSG0001` 1라인, `ORDER_QTY=60`, `RECEIVED_QTY=60`, `LINE_STATUS=CLOSE` |
| `MAT_ARRIVALS` | `R26061200008` 기준 3건, 각 `QTY=20`, `IQC_STATUS=PASS`, `STATUS=DONE` |
| `MAT_LOTS` | 시리얼 3건 생성, 각 `INIT_QTY=20`, `CURRENT_QTY=20`, `IQC_STATUS=PASS`, `STATUS=NORMAL` |
| `IQC_LOGS` | `RESULT=PASS`, `STATUS=DONE`, `SAMPLE_BARCODE`에 시리얼 3개 기록, 검사성적서 파일 경로 저장 |
| `MAT_RECEIVINGS` | `RCV20260612-0007` 기준 3건, 각 `QTY=20`, `WAREHOUSE_CODE=RM_MAIN`, `STATUS=DONE` |
| `STOCK_TRANSACTIONS` | 입하 `MAT_IN` 3건과 입고 `RECEIVE` 3건, 총 6건 생성 |
| `MAT_STOCKS` | 각 시리얼 `RM_MAIN` 재고 `20`, `W001` 재고 `0` |

검사성적서 파일 경로:

```text
C:\Project\HANES\apps\backend\uploads\iqc-certs\iqc-cert-1781234356885-813607009.txt
```

## 남긴 기록

테스트 데이터는 삭제하지 않았다. 아래 실데이터가 JSHANES에 남아 있어 이후 화면 또는 DB에서 추적 가능하다.

- `PURCHASE_ORDERS.PO_NO = 'PO-IQC3-26061203191605'`
- `MAT_ARRIVALS.ARRIVAL_NO = 'R26061200008'`
- `IQC_LOGS.ARRIVAL_NO = 'R26061200008'`
- `MAT_RECEIVINGS.RECEIVE_NO = 'RCV20260612-0007'`
- `MAT_LOTS.MAT_UID IN ('VH1-RM260612-00017', 'VH1-RM260612-00018', 'VH1-RM260612-00019')`
