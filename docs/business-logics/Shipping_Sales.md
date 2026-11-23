# Shipping Sales

tags: #shipping #sales-order #erp-interface

## 화면 참고

- 모델 마스터 관리.
- 고객사 생산계획 관리.
- 납품계획 관리.
- 출하지시 조회.

## 인터페이스

- 신규 출하정보 인터페이스 테이블 레이아웃이 작성됐다.
- 2026-05-11 인터페이스 레이아웃 추가 요청분이 수정됐다.
- `6: 리턴(WIP Completion Return)`에도 로케이터 컬럼이 추가됐다.
- MES -> ERP 양품실적 테이블에 `LOCATOR_CODE`가 추가됐다.

## 주문/반품

- `XXOM_MES_PICK_AND_RETURN_V`로 Sales Order/주문 정보를 확인한다.
- 주문은 출하지시까지 진행되어야 내려온다.
- 반품은 주문 등록 후 확정하면 내려온다.

## 관련 노트

- [[ERP_Interface]]
- [[MES_Views]]
- [[Labels_Barcodes]]
- [[Open_Issues]]

