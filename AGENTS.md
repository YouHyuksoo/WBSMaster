# WBS Master - 프로젝트 가이드

이 파일은 이 저장소에서 작업하는 AI 에이전트(Claude Code, Codex, Grok)를 위한 단일 프로젝트 지침이다.

## 개요

- 프로젝트 관리용 WBS 도구 (Next.js 16 + Prisma 7 + 로컬 PostgreSQL).
- Supabase(DB·Storage)는 2026-10-23 제거됐다. `supabase/migrations` 는 레거시 스냅샷일 뿐이다.
- 대부분의 데이터는 `projectId` 로 필터링된다.

## 명령·환경

- npm 사용 (`package-lock.json`). `npm run start` 는 `0.0.0.0` 에서 서빙한다.
- `prisma/schema.prisma` 변경 후 `npx prisma generate` 필수 (`npm run build` 와 `postinstall` 은 자동 실행).
- 새 Enum 값 추가 후 `prisma db push` + `prisma generate` 하고 **개발 서버를 재시작**해야 한다. 안 하면 `Value 'X' not found in enum` 오류.
- 환경 변수: `.env.example` 을 복사해 `.env.local` 에 둔다. `DATABASE_URL`, `DIRECT_URL`(마이그레이션용) 필수, `UPLOAD_DIR` 선택(기본 `<프로젝트>/uploads`).
- `scripts/` 의 import/seed/backup/repair 유틸은 런타임 앱 코드에서 import 하지 않는다.

## Git·배포

- 브랜치는 `master` 하나 (원격 `origin/master`).
- `master` 에 push 하면 GitHub Actions(self-hosted, 지성 IDC 서버)가 자동 배포한다. 자세한 내용: `docs/DEPLOYMENT.md`.
- husky pre-push 가 `npm ci --dry-run`(lock 동기화)과 `npx tsc --noEmit` 을 돌린다. 타입 오류나 lock 불일치가 있으면 push 가 막힌다. pre-commit 은 검증 없음.
- 커밋 메시지: Conventional Commit 접두사(`feat:`, `fix:`, `docs:`, `ci:`, `refactor:`) + 한국어 요약, 한 커밋에 한 변경.
- PR 에는 요약, 관련 이슈/태스크, 테스트 결과, Prisma 변경 시 마이그레이션 노트, 화면 변경 시 스크린샷을 넣는다.

## 코드 규칙

- 모든 파일 상단에 한국어 JSDoc: `@file <경로>`, `@description`, `초보자 가이드:` 목록 (기존 파일 형식을 따른다).
- 파일당 200줄 권장, 300줄 초과 시 분리. 기능 페이지는 `src/app/dashboard/<feature>/` 아래 `page.tsx`(조합만) + `components/`(index.ts export) + `hooks/` + `types.ts` 로 나눈다.
- import 는 `@/*` 별칭 사용. 컴포넌트 `PascalCase`, 훅 `use*`.
- 테스트는 Vitest(jsdom), 파일명 `*.test.ts(x)`, 소스 옆에 둔다.
- 인증이 필요한 API: `@/lib/auth` 의 `const { user, error } = await requireAuth(); if (error) return error;`, 프로젝트 권한은 `assertProjectAccess(projectId, user)`. 공개 API(예: `GET /api/uploads/[...path]`)만 예외.
- `[id]` Route Handler 의 `params` 는 Promise 이므로 `await params` 로 쓴다 (Next.js 16).
- React Flow 의 `selectionMode`/`connectionMode` 는 문자열 리터럴이 아니라 `SelectionMode`, `ConnectionMode` enum 을 import 해서 쓴다.

## 타입 동기화 (필드 추가 시 빌드 오류 단골 원인)

타입이 3곳에 나뉘어 있어 한 곳만 고치면 빌드가 깨진다. Prisma 모델에 필드를 추가/수정하면:

1. `prisma/schema.prisma` 수정 후 `npx prisma generate`
2. `src/lib/api.ts` 의 해당 `create`/`update` 함수 파라미터 타입
3. `src/hooks/use*.ts` 의 `useCreate*`/`useUpdate*` `mutationFn` 타입

자주 놓치는 곳: `api.ts` 의 `equipment`, `equipmentConnections`, `users`(+ `hooks/useUsers.ts`). 새 Enum 값은 대시보드 모듈의 `types.ts`, `constants.ts`(라벨/아이콘)에도 추가한다.

## UI

- 리스트형 페이지(헤더·통계 카드·탭·필터·그리드 테이블·상태 드롭다운) 규칙: `docs/design/list-page-style.md`. 참고 구현: `src/app/dashboard/issues/page.tsx`, `customer-requirements/page.tsx`.
- 다크모드: `dark:` 클래스와 함께 기본 라이트 모드 색상도 명시한다.

## 메뉴 (HANES 방식, 2026-11-10)

- 화면 목록(메뉴 코드 · 이름 · 주소 · 아이콘)은 `src/lib/menu/menu-config.ts` 의 `MENU_REGISTRY`, 그룹 · 배치 · 순서는 DB(`menu_categories`, `menu_category_items`, 시스템관리 > 메뉴 관리), 역할별 접근은 `role_menu_permissions`(권한 관리), 즐겨찾기는 `user_menu_favorites` · `user_menu_favorite_folders`.
- 새 화면을 만들면 `MENU_REGISTRY` 에 등록한다(코드는 바꾸지 않는다). 등록만 하면 "미배치 메뉴"라 좌측 메뉴에 안 보이므로, 운영에는 배치 · 권한 행을 넣는 SQL(`INSERT ... ON CONFLICT DO NOTHING`)을 새 마이그레이션으로 함께 둔다. `DEFAULT_MENU_LAYOUT` 에도 추가한다(`DashboardSidebar.test.ts` 가 검사).
- ADMIN 은 권한 행과 관계없이 모든 메뉴를 쓴다. `systemOnly` 메뉴는 다른 역할에 줄 수 없다. 메뉴 · 권한 관리 API 는 ADMIN 전용이다.
- 권한 없는 메뉴는 좌측 메뉴에서 흐리게 보이고, 주소로 들어오면 `MenuAccessGuard` 가 본문 대신 권한 없음 안내를 보여 준다. 데이터 API 의 로그인 · 프로젝트 권한 검사는 별개다.
- 배포 스크립트는 DB 구조를 바꾸지 않는다. 새 테이블 · 칼럼이 있는 마이그레이션은 배포 전에 운영 DB 에 먼저 적용한다.

## 파일 업로드

- 업로드는 서버 로컬 디스크에 저장한다: `src/lib/uploads.ts` 의 `saveUpload()` → `UPLOAD_DIR` 또는 `<프로젝트>/uploads` (git 제외).
- 클라이언트는 항상 `POST /api/upload`(FormData `file`, 인증 필요)를 거친다. 조회는 `GET /api/uploads/[...path]`(공개, 이미지 확장자만).
- `public/` 에 저장하지 않는다. Next.js 는 빌드 후 `public/` 에 추가된 파일을 서빙하지 않는다.

## 엑셀 데이터 가져오기

- 엑셀 → DB 입력은 API(curl, 인증 필요)가 아니라 `scripts/import-*.ts` 스크립트로 한다. 실행: `npx tsx scripts/<파일>.ts`.
- 스크립트는 Next.js 밖에서 돌아 `.env.local` 이 자동 로드되지 않는다. 맨 위에서 `dotenv` 로 `.env.local` 을 먼저 로드하고 Prisma 7 adapter(`PrismaPg` + `pg` `Pool`)로 클라이언트를 만들어야 한다. 아니면 `PrismaClient needs valid options`. 끝에 `prisma.$disconnect()` 와 `pool.end()` 를 호출한다. 기존 `scripts/import-as-is-ochang.ts` 를 템플릿으로 쓴다.
- 병합 셀: 대분류/중분류가 비면 이전 값을 유지한다. 전각 공백(`　`)은 `.trim()` 후 빈 문자열 체크. 엑셀 값 → Enum 매핑 테이블에 모든 값을 정의한다.
- 재실행 안전: 기존 항목을 삭제한 뒤 다시 넣는다.

### 사업부 (2026-11-09 다중 사업부 관리 제거)

- 다중 사업부를 관리하지 않는다. 모든 `businessUnit` 칼럼은 DB 기본값 `POLE`(행성사 오창)을 가진다 (`prisma/schema.prisma` `@default("POLE")`).
- 화면 · API 는 사업부 값을 묻지도, 받지도, 보내지도 않는다. 저장은 DB 기본값에 맡긴다.
- `DEFAULT_BUSINESS_UNIT`(`src/constants/business-units.ts`)은 고유키 조회(AS-IS 총괄 `projectId_businessUnit`, 기능추적표 적용 행 `masterId_businessUnit`)에만 쓴다.
- 규칙 검사: `src/constants/business-units.test.ts` (스키마 기본값 일치, API 가 요청 사업부를 읽거나 임의 값을 쓰지 않음).
- AS-IS 분석은 프로젝트당 총괄표 하나다. 오창 데이터 스크립트: `scripts/import-as-is-ochang.ts` (`BUSINESS_UNIT=POLE`).
- 베트남 사업부별 스크립트(`import-as-is-{vivi,pcba,disp,hns}`, `fix-business-units`, `fix-other-to-master`, `check-business-units`, `migrate-process-verification`)는 삭제했다. 필요하면 git 이력에서 꺼낸다.

### AS-IS 엑셀 가져오기 스크립트 공통

- 데이터는 3번째 행(index 2)부터. 대분류가 매핑되지 않으면 `MASTER` 로 넣는다. 현행시스템 컬럼으로 `currentMethod`(SYSTEM/MANUAL/EXCEL)를 자동 판단하고, 담당부서 컬럼은 쓰지 않는다.

### 화면 엑셀 가져오기

- 가져오기 라우트는 칼럼을 위치로 읽는다. 칼럼 구성을 바꾸면 템플릿 · 파서를 같이 고치고, 예전 템플릿을 거부하는 검사(`src/lib/import-guards.ts`)를 둔다.
- `clearExisting` 삭제는 파일 검사(400) 뒤에만 한다. `src/app/api/import-routes-order.test.ts` 가 모든 import 라우트를 검사한다.
