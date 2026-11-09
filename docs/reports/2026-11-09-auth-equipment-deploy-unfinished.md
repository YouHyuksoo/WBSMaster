# API 인증 · 설비유형 · 모달 — 배포 전 미완료 기록 (2026-11-09)

작업 세션: Claude Code (wbsmaster-d9). 로컬 검증까지 끝났고 **커밋 · 배포 안 함**.

## 바뀐 것 (작업 트리, 미커밋)

- API 인증: `src/app/api/**/route.ts` 거의 전부에 `requireAuth` + `assertProjectAccess`. 사용자 API(역할 변경 ADMIN 만), DB 백업 · `admin/cleanup-tasks` · `verify-delay-rate` 는 ADMIN 전용.
  - 검사: `src/app/api/route-auth.test.ts` (로그인 · 프로젝트 멤버 · 동적 경로 · 본문보다 인증 먼저).
- 설비유형: `enum EquipmentType` 을 오창 설비 19개로 교체 (`prisma/schema.prisma`, `src/lib/api.ts`, `equipment/types.ts`, `src/lib/llm/schema-info.ts`, `src/lib/equipment-type.ts`).
  - 검사: `src/lib/equipment-type.test.ts`.
- 모달: 글 입력칸 있는 모달 max-w-3xl 이상 + 자동 높이, 공용 `Modal` 크기 한 단계씩 확대.
  - 검사: `src/components/ui/modal-width.test.ts`.

## 배포 전 처리 (2026-11-09 21:40 완료)

1. 운영 DB 백업: 서버 `D:\Project\WBSMaster\backups\wbs-before-deploy-2026-11-09T12-38-39-837Z.sql` (pg_dump).
2. 운영 DDL 적용 (push 전, 한 트랜잭션, 적용 직전 equipments 0건 확인):
   - 설비유형 enum 교체 (아래 SQL 과 같은 내용)
   - AI 채팅 재구성(eb63975): `ai_settings.chatgptModel` 추가 · provider 기본값 chatgpt, `chat_histories.pendingActionId` · `toolSummary`, 새 테이블 `chat_pending_actions`
   - `prisma migrate diff` 로 다시 비교하면 `DROP INDEX progress_task_stage_details_status_idx` 하나만 남는다. 운영에만 있는 인덱스라 일부러 두었다.
3. 운영 `.env.local` 에 `CHATGPT_AUTH_FILE=D:/Project/WBSMaster-secrets/chatgpt-auth.json` 추가 (저장소 밖, 원본은 `.env.local.bak-*`). 배포 뒤 관리자가 설정 > AI 어시스턴트 > 회사 ChatGPT 에서 연결해야 한다.
4. 커밋: 다른 세션(wbsmaster-12, wbsmaster-8f)이 각자 커밋한 뒤 남은 변경을 성격별 7개 커밋으로 올렸다.

```sql
BEGIN;
ALTER TYPE "EquipmentType" RENAME TO "EquipmentType_old";
CREATE TYPE "EquipmentType" AS ENUM (
  'BENDING_FUSION', 'BENDING', 'AMR',
  'FUSION', 'EDGE', 'SURFACE_TREATMENT',
  'VISION_INSPECTION', 'INSPECTION',
  'PLC', 'OPC_SERVER', 'BARCODE_PRINTER', 'PRINTER', 'SCANNER', 'PDA', 'PC',
  'MACHINE', 'DEVICE', 'CONVEYOR', 'OTHER'
);
ALTER TABLE "equipments" ALTER COLUMN "type" TYPE "EquipmentType" USING "type"::text::"EquipmentType";
DROP TYPE "EquipmentType_old";
COMMIT;
```

## 확인된 것 (로컬)

- tsc 0 오류, vitest 55 파일 294 테스트 통과.
- 쿠키 없이 288 개 핸들러 호출 → 전부 401.
- 멤버 USER 200 / 비멤버 USER 403 (목록 API 20개), 자기 역할 ADMIN 변경 403, 다른 사용자 수정 403, 백업 목록 403.
- ADMIN 으로 대시보드 22개 화면 → API 오류 0건. 대표 모달 4개 폭 768~896px.
- 운영 사용자 확인(읽기 전용): 비 ADMIN 은 모두 행성오창V2 멤버 → 배포 뒤 403 으로 막히는 사람 없음. 단, 중복 `허민`(소속 없음, 프로젝트 없음) 계정 1개.

## 남은 결정 · 알려진 구멍

- `userId` 쿠키가 사용자 ID 그대로라, ID 를 알면 다른 사람으로 행세할 수 있다 (세션 서명 필요 — 구조 변경).
- 비밀번호가 평문 저장(기본값 `admin123`).
- 이슈 · 요구사항 · 협의요청 · 태스크 · WBS 의 담당자 · 보고자 ID 가 같은 프로젝트 멤버인지 검사하지 않는다.
- 비모달 패널의 고정 높이 입력칸: `EquipmentSidebar`, `TaskFlowSidebar`, `StageDetailEditor`, `WbsDetailPanel`, `settings/page.tsx` 619·636행.
