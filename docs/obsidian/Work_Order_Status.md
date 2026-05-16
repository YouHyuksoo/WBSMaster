# Work Order Status

tags: #work-order #erp-interface

## 상태값

- `3`: 확정.
- `4`: 생산완료.
- `7`: 취소.
- `12`: 마감/Closed.

## 반영 사항

- [[MES_Views]]의 `XMES_WIP_DISCRETE_JOBS_V`, `XMES_WIP_MTL_REQ_V`에 `12(Closed)`가 추가됐다.
- `XMES_WIP_MTL_REQ_V`에는 `STATUS_TYPE` 컬럼도 추가됐다.

## ERP 취소 방지

- MES에서 작업지시 START 후 ERP에서 작업지시를 취소하지 못하게 해야 한다.
- ERP는 `xwip_mes_status` 테이블을 체크한다.
- MES는 직접 INSERT하지 않고 `xwip_mes_status_pkg.insert_row`를 호출해야 한다.

```sql
PROCEDURE insert_row
(
  o_errmsg          OUT NOCOPY VARCHAR2,
  o_errtag          OUT NOCOPY NUMBER,
  p_organization_id IN         NUMBER,
  p_wip_entity_name IN         VARCHAR2,
  p_mes_status      IN         VARCHAR2,
  p_attribute1      IN         VARCHAR2 DEFAULT NULL,
  p_attribute2      IN         VARCHAR2 DEFAULT NULL,
  p_attribute3      IN         VARCHAR2 DEFAULT NULL,
  p_attribute4      IN         VARCHAR2 DEFAULT NULL,
  p_attribute5      IN         VARCHAR2 DEFAULT NULL
);
```

## 관련 노트

- [[ERP_Interface]]
- [[MES_Views]]
- [[Open_Issues]]

