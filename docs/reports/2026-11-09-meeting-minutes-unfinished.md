# 회의록관리 기능 — 미완료 기록 (2026-11-09)

## 한 일
- 커밋 `c26916b` (회의록관리 · 엑셀(AI) 가져오기), `7b6a0fd` (프로젝트 중복 표시 제거) — master, push 전
- 로컬 PG(127.0.0.1:55432/wbsmaster): `prisma db push` 로 meeting_minutes, meeting_minute_items 생성
- 운영 PG(지성 IDC jisung-idc, 127.0.0.1:5432/wbsmaster): 2026-11-09 같은 두 테이블 생성 완료
  (CREATE TABLE 2 · INDEX 3 · FK 2, 트랜잭션 하나로 실행, 생성 전 테이블 없음 · 프로젝트 1개 확인)
- 로컬 화면 확인(EGO, 개발 서버 3000): 메뉴 이동 · 등록 · 펼치기 · 수정 · 삭제 · 실제 양식 파일 가져오기 · 중복 건너뜀 ·
  양식이 다른 가짜 파일 AI 읽기. 확인용 데이터는 모두 삭제함

## 남은 일
1. master push (사용자가 결정) → GitHub Actions 배포 결과 확인
2. 배포 후 https://wbs.jisheng.co.kr 회의록관리 화면 열어 보기 (빈 목록이 정상)
