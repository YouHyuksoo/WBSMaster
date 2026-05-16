# Display Model Change

tags: #display #model-change #analysis

## 요구사항

- 모델체인지 타임 분석이 가능하도록 로직 반영 요청이 있었다.
- `Full Model change`에 대해 모델체인지 시퀀스를 정리해야 한다.
- 각 시퀀스별 상태를 자동 수집할 수 있는 방안을 수립해야 한다.
- 수집된 진행상황은 화면에서 표시되어야 한다.

## 설계 검토 항목

- 모델체인지 시작/종료 기준.
- 시퀀스 단계 정의.
- 단계별 자동 수집 가능 데이터와 수동 입력 데이터 구분.
- 설비/라인/작업자/품번 변경 이벤트 연결 방식.
- 모델체인지 소요시간 집계 및 병목 분석 기준.

## 관련 노트

- [[Display_PCBA_Inspection]]
- [[Equipment_Interface]]
- [[Reports_Monitoring_PDA]]
- [[Open_Issues]]

