# Development Environment

tags: #development #server #database #deployment

## 서버/접속

- MES V1 DLL 사용 APP 서버:
  - 외부 IP: `10.7.10.11`
  - 내부 IP: `10.7.20.11`
  - 포트: `8060(HSSMT_IF)`, `8242(HS_SMT_MES_DLL_ROUTE)`.
- MES V1 DLL 사용 DB 서버 VIP:
  - 외부 IP: `10.7.10.39`
  - 내부 IP: `10.7.20.39`
  - 포트: `8030(HSSMT_IF)`, `8031(HSSMT_IF_A)`, `8032(HSSMT_IF_B)`.
- 현장 설비에 사용할 IP는 2개가 아니라 4개로 확인됐다.

## 개발 DB

- 개발 DB 테이블스페이스는 `D:\ORADATA\LSVTNDEV` 위치에 생성하기로 했다.
- `LISNER` 스키마에 클래버 4.4가 생성됐다.
- 운영 서버 구성 시 별도 스토리지 공간 협의가 필요하다.

## 소스/배포

- V5 소스 코드가 사내 GitLab에 업로드됐다.
- 개발자는 Git 설치, 행성 VPN 접속 후 GitLab 저장소를 clone한다.
- 배포 툴 기본은 MSSQL 전용이고 Oracle 연결 버전은 `_ora` suffix로 별도 업로드됐다.
- `Cleber.MES_V5_Table_정의서.xlsx`는 클래버 4.4 기준 고정본이다.

## 관련 노트

- [[Project_Overview]]
- [[ERP_Interface]]
- [[Weekly_Report]]
- [[Documents_SharePoint]]

