# MES Views

tags: #mes-views #erp-interface #oracle

## `XMES_WIP_DISCRETE_JOBS_V`

- `COMPLETION_LOCATOR_CODE` 추가.
- 운영/DEV/TFT 모두 수정.
- `WORK_TYPE` 추가.
- 작업지시 엑셀 업로드 기준: 양산은 빈칸, 개발은 `DEV`.
- `CLASS_CODE` 추가.
- `DISCRETE`: 정상.
- `REWORK`: 재작업.
- 상태값 `12(Closed/마감)` 추가.

## `XMES_WIP_MTL_REQ_V`

- 외주/사급BOM 관련 뷰다.
- 표준 작업지시도 포함된다.
- `SUPPLY_LOCATOR_CODE` 추가.
- `12(Closed/마감)` 상태 추가.
- `STATUS_TYPE` 컬럼 추가.

## 기타 뷰

- `XMES_INV_ITEM_MASTER_V`: 조회 오류 수정 후 정상 확인.
- `XMES_INV_TRX_ACCOUNT_V`: 기타입출고/타계정 유형 관련 뷰.
- `XMES_HR_EMP_V`: 해외 인사정보 조회되도록 변경. 멕시코는 별도 수집 필요.
- 라인 마스터: 기존 뷰 영향 때문에 컬럼명 변경 대신 `ORGANIZATION_CODE` 추가.
- `XXOM_MES_PICK_AND_RETURN_V`: 주문/반품 확인용 뷰.

## 관련 노트

- [[ERP_Interface]]
- [[Work_Order_Status]]
- [[Material_Inventory]]
- [[Shipping_Sales]]
- [[Open_Issues]]

