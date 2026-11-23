# HNS Subcontract

tags: #hns #subcontract #inventory

## HNS 자재 및 WIP 출고

- 외주팀으로부터 자재 출고 요청 접수.
- 창고에서 요청에 따라 자재 준비.
- 서브콘이 창고에서 NVL 수령.
- 창고에서 자재/WIP 인보이스와 패킹리스트 작성 후 서브콘 FWD 전달.
- FWD가 인보이스로 수입 신고.
- 자재/WIP 출고 데이터는 매일 ERP 업로드.

## 외주에서 Haengsung 입고

- Haengsung이 Subcon에 납품 계획 Request 송부.
- Subcon이 대응 가능 수량 검토 후 회신.
- Haengsung이 수량 Confirm.
- Haengsung이 Subcon에 PO 발행.
- Subcon이 Invoice/Packing List 작성 후 FWD 전달.
- FWD가 세관 신고.
- 통관 완료 후 Subcon에서 Haengsung으로 실물 납품.
- Haengsung이 입고 수량 확인 및 창고 입고 처리.

## 시스템 방향

- 현재 관련 서류는 수기/엑셀로 작성 중이다.
- 우선 MES에서 리스트 출력이 가능하도록 대응하기로 했다.

## 관련 노트

- [[Material_Inventory]]
- [[ERP_Interface]]
- [[Open_Issues]]

