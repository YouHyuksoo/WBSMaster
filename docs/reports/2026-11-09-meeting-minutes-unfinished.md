# 회의록관리 기능 — 미완료 기록 (2026-11-09)

## 한 일 (로컬 검증 완료)
- 메뉴 `회의록관리` (`/dashboard/meeting-minutes`), API `/api/meeting-minutes`, `[id]`, `import`
- Prisma 모델 `MeetingMinute`(meeting_minutes), `MeetingMinuteItem`(meeting_minute_items)
- 로컬 PG(127.0.0.1:55432/wbsmaster)에 `prisma db push` 완료 (CREATE TABLE 2개 · INDEX · FK 만)
- 엑셀 가져오기: 양식 규칙(`src/lib/meeting-minutes-excel.ts`) → 못 읽은 시트는 LLM(`src/lib/meeting-minutes-ai.ts`)
- 화면 확인(EGO, 개발 서버 3000): 메뉴 이동 · 등록 · 펼치기 · 수정 · 삭제 · 실제 양식 파일 가져오기 · 중복 건너뜀 ·
  양식이 다른 가짜 파일 AI 읽기. 확인용 데이터는 모두 삭제함 (남은 회의록 0건)

## 남은 일
1. **운영(지성 IDC) DB 반영** — 배포 워크플로는 `prisma generate` 만 하고 스키마를 올리지 않는다.
   운영 DB 에 두 테이블을 만들기 전에 push 하면 운영 회의록 화면 · API 가 500 이 된다.
   DDL: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (운영 접속 기준으로 실행)

## 재개 전 확인
- 로컬: 위 migrate diff 가 비어 있는지
- 운영 DB 에 meeting_minutes 테이블이 있는지
