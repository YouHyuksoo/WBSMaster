# ERP Interface

tags: #erp-interface #mes-v2 #oracle

## 반영 원칙

- 단순 제공 뷰 컬럼 추가는 운영/DEV/TFT에 동시에 반영 가능하다.
- 받는 업무, 프로시저 로직, 프로그램 수정이 필요한 항목은 DEV 테스트 후 PROD 반영한다.
- PROD는 사용 중인 법인이 있어 테스트 없이 바로 반영하면 안 된다.

## 창고/로케이터

- 베트남 ERP는 창고와 로케이터를 분리 관리한다.
- 예시: 창고 `110`, 로케이터 `E01`.
- ERP에는 로케이터 ID가 별도 존재한다.
- 작업지시 완료창고는 창고와 로케이터를 분리해야 한다.
- `[Ky gui]`는 500번대 고객사 창고다.

## 조직/법인

- `ORG` 또는 `OU`는 `ORGANIZATION`의 상위 개념이다.
- 재고 관리는 `ORGANIZATION` 기준으로 관리해야 한다.
- MES 내부 조회는 `ORGANIZATION_ID` 기준이 성능상 유리하다.
- 해외 법인은 인사 모듈과 `ORGANIZATION_CODE` 보유 여부가 다를 수 있다.

## 관련 노트

- [[MES_Views]]
- [[Work_Order_Status]]
- [[Material_Inventory]]
- [[Shipping_Sales]]
- [[Development_Environment]]

