# WBS Master Constitution

WBS Master 는 이미 운영 중인 프로젝트 관리 도구다(완성도 95% 이상). 이 헌법은 남은 기능 추가와
수정이 기존 동작·데이터·디자인을 깨지 않게 하는 판정 기준이다. 모든 spec·plan·tasks 는
이 문서와 대조해 통과해야 한다.

## Core Principles

### I. 기존 코드 보호 (NON-NEGOTIABLE)

- 변경은 spec 이 요구한 범위로 한정한다. 요청되지 않은 리팩터링, 이름 변경, 파일 이동,
  폴더 재구성, 일괄 포맷 변경, 의존성 교체·업그레이드를 MUST NOT 한다.
- 기존 화면·API 의 동작, 응답 형태, URL, 업무 문구는 spec 이 명시적으로 바꾸라고 할 때만
  바꾼다. 그 외에는 그대로 보존한다.
- 작업 중 발견한 관련 없는 결함이나 개선점은 고치지 않고 보고하거나 별도 spec 후보로 남긴다.
- "파일당 300줄 초과 시 분리" 규칙은 새로 만들거나 이번 spec 으로 수정하는 파일에 적용한다.
  분리만을 목적으로 기존 파일을 손대지 않는다.
- 기존 테스트를 지우거나 기대값을 바꿔 통과시키지 MUST NOT 한다. 기대값 변경은 spec 이
  동작 변경을 요구할 때만 하고, plan 에 그 이유를 적는다.
- 근거: 운영 데이터와 사용자가 확인한 화면이 이미 있다. 넓은 수정은 회귀 위험만 키운다.

### II. Next.js 16 App Router 구조

- 라우팅은 `src/app` App Router 만 쓴다. `pages/` 디렉터리를 만들지 MUST NOT 한다.
- 기능 화면은 `src/app/dashboard/<feature>/` 아래 `page.tsx`(조합만) + `components/`
  (`index.ts` export) + `hooks/` + `types.ts` 로 나눈다.
- API 는 `src/app/api/**/route.ts` Route Handler 로 만든다. 동적 세그먼트의 `params` 는
  Promise 이므로 `await params` 로 읽는다.
- import 는 `@/*` 별칭을 쓴다. 컴포넌트는 `PascalCase`, 훅은 `use*` 로 이름 짓는다.
- 서버 데이터는 기존 `src/lib/api.ts` + `src/hooks/use*.ts`(TanStack Query) 경로로 가져온다.
  같은 일을 하는 새 데이터 계층을 만들지 않는다.
- 새 소스 파일 맨 위에는 기존 형식의 한국어 JSDoc(`@file`, `@description`,
  `초보자 가이드:`)을 단다.
- `scripts/` 의 import·seed·backup·repair 유틸은 런타임 앱 코드에서 import 하지 않는다.

### III. 기존 UI 체계 준수

- 시각 기준의 단일 출처는 `DESIGN.md` 이고, 공통 부품 규칙은 `docs/design/overview.md`,
  리스트형 화면은 `docs/design/list-page-style.md` 를 따른다.
- UI 부품은 기존 `@/components/ui`(Button, Card, Modal, ConfirmModal, Input, Toast 등)와
  `@jisung/ui`(그리드는 `WbsDataGrid` 래퍼 경유)를 먼저 쓴다.
- `components.json` 에 shadcn 설정이 있으나 shadcn·Radix 컴포넌트는 도입되지 않았다.
  shadcn 컴포넌트 추가(`shadcn add`)나 새 UI 라이브러리 도입은 spec 에서 근거를 대고
  사용자 승인을 받은 뒤에만 한다. 기존 부품과 같은 역할의 부품을 새로 만들지 않는다.
- 색은 `globals.css` 의 CSS 변수·의미 토큰을 쓴다. 하드코딩 색, 정보 카드의 파스텔 상태색
  배경을 쓰지 MUST NOT 한다. 다크모드는 `dark:` 와 라이트 기본 색을 함께 적고,
  DESIGN.md 의 다크 높이 단계를 지킨다.
- 아이콘은 기존 Material Symbols 를 유지한다. 브랜드 컬러 테마(`data-color-theme`)를
  깨지 않는다.
- 새 화면은 `src/lib/menu/menu-config.ts` 의 `MENU_REGISTRY` 와 `DEFAULT_MENU_LAYOUT` 에
  등록하고, 운영 배치·권한 행은 `INSERT ... ON CONFLICT DO NOTHING` 마이그레이션으로 둔다.

### IV. Prisma·데이터 변경 신중

- `prisma/schema.prisma` 변경은 spec 이 요구할 때만 한다. plan 에 바뀌는 모델·칼럼·Enum,
  기존 데이터 영향, 운영 적용 순서를 적는다.
- 칼럼·테이블 삭제, 이름 변경, 타입 축소처럼 데이터를 잃을 수 있는 변경은 이전·복구 계획과
  사용자 승인 없이 MUST NOT 한다. 추가는 nullable 또는 기본값을 가진 칼럼으로 한다.
- 운영 DB 변경은 `prisma/migrations/` 의 마이그레이션 파일로 남긴다. 배포는 DB 구조를 바꾸지
  않고, CI 가 `prisma migrate status` 로 미적용 마이그레이션이 있으면 배포를 멈춘다.
  새 마이그레이션은 push 전에 운영 DB 에 적용하고 기록한다.
- 스키마를 바꾸면 세 곳을 함께 고친다: `schema.prisma` → `npx prisma generate`,
  `src/lib/api.ts` 의 create/update 파라미터 타입, `src/hooks/use*.ts` 의 mutationFn 타입.
  새 Enum 값은 해당 모듈의 `types.ts`·`constants.ts` 에도 넣는다.
- 업무 데이터는 `projectId` 로 범위를 나눈다. `businessUnit` 은 DB 기본값 `POLE` 에 맡기고
  화면·API 가 읽거나 보내지 않는다(`src/constants/business-units.test.ts` 가 검사).
- 업로드 파일은 `saveUpload()` 로 서버 로컬 디스크(`UPLOAD_DIR`)에 저장하고 `public/` 에
  저장하지 않는다.

### V. 인증·프로젝트 권한 유지

- 데이터 API 는 `@/lib/auth` 의 `requireAuth()` 로 로그인을 확인하고, 프로젝트 데이터는
  `assertProjectAccess(projectId, user)` 로 권한을 확인한다. 공개 API 는 기존 예외
  (`GET /api/uploads/[...path]` 등)만 허용하고 새 공개 API 는 spec 에서 근거를 댄다.
- 메뉴 접근 제어(`MenuAccessGuard`, `role_menu_permissions`)와 데이터 API 권한 검사는
  별개다. 한쪽이 있다고 다른 쪽을 생략하지 MUST NOT 한다.
- 메뉴·권한 관리 API 는 ADMIN 전용을 유지한다.

### VI. 공개 저장소 기밀 보호 (NON-NEGOTIABLE)

- 이 저장소는 GitHub 공개(PUBLIC) 저장소다. 커밋되는 모든 파일(소스, spec, plan, tasks,
  docs, 테스트 데이터, 스크립트, 이 헌법 포함)은 누구나 읽는다고 가정한다.
- 다음을 커밋하지 MUST NOT 한다: 비밀번호·토큰·API 키·`DATABASE_URL` 등 접속 정보,
  `.env*`(`.env.example` 제외), 사내·고객 서버 IP·호스트명, 고객사 실데이터(엑셀 원본,
  DB 덤프, 회의 녹음·전사문, 업로드 파일), 개인 연락처.
- spec·테스트·예시는 가상의 값을 쓴다. 실제 고객 데이터가 필요한 가져오기 작업은 데이터를
  저장소 밖(`.gitignore` 대상)에 두고 경로만 환경 변수로 받는다.
- 커밋 전에 staged 파일 목록을 확인한다. `.gitignore` 의 `.env*`, `/uploads`, `/backups`,
  `backup*.sql` 제외 규칙을 약하게 만들지 않는다.
- 기밀이 이미 커밋된 것을 발견하면 더 퍼뜨리지 말고 사용자에게 즉시 알린다(키 교체 필요).

### VII. 검증 게이트

- push 전에 `npx tsc --noEmit` 이 통과해야 한다(husky pre-push 가 lock 동기화와 함께 강제).
- 바뀐 로직은 Vitest(jsdom) 테스트를 소스 옆 `*.test.ts(x)` 로 둔다. 같은 유형의 결함이 두 번
  나오면 문서 규칙이 아니라 테스트·타입·린트로 막는다.
- 화면 변경은 실제 브라우저에서 라이트·다크 모두 확인한 뒤 완료로 본다. 확인하지 못한 항목은
  미확인으로 보고한다.
- `main` push 는 곧 운영 자동 배포다. 검증이 끝나지 않은 변경을 push 하지 MUST NOT 한다.

## 기술 스택 제약

| 영역 | 확정 기술 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 16.1 App Router, React 19.2, TypeScript 5 | `pages/` 금지 |
| 스타일 | Tailwind CSS 4, `globals.css` 토큰 | `DESIGN.md` 기준 |
| UI 부품 | `@/components/ui`, `@jisung/ui`(vendor tgz) | shadcn 미도입 |
| 서버 상태 | TanStack Query 5 + `src/lib/api.ts` | |
| DB·ORM | 로컬 PostgreSQL, Prisma 7(`@prisma/adapter-pg`) | Supabase 는 2026-10-23 제거(관련 파일 2026-11-16 삭제) |
| 그리드·차트 | `WbsDataGrid`(jisung-ui), Recharts, ECharts, React Flow | React Flow 모드는 enum import |
| 테스트 | Vitest 2 + Testing Library(jsdom) | |
| 패키지 | npm(`package-lock.json`) | 다른 패키지 매니저 금지 |
| 배포 | `main` push → GitHub Actions(self-hosted) | DB 구조는 배포가 바꾸지 않음 |

- 새 런타임 의존성 추가는 plan 에 이유·대안·번들 영향을 적고 승인받는다. 기존 라이브러리로
  가능한 일은 기존 것을 쓴다.
- Supabase SDK·환경 변수·`supabase/` 폴더를 되살리지 않는다.

## 개발 워크플로·품질 게이트

1. `/speckit-specify` 로 spec 을 쓸 때 "바꾸는 것"과 "바꾸지 않는 것(보존 대상)"을 함께 적는다.
2. `/speckit-plan` 은 이 헌법의 원칙별 점검(Constitution Check)을 통과해야 한다. 위반이 필요하면
   plan 의 Complexity Tracking 에 이유와 더 단순한 대안을 버린 이유를 적는다.
3. `/speckit-tasks` 는 스키마 변경, 타입 3곳 동기화, 메뉴 등록, 마이그레이션 운영 적용,
   테스트를 각각 별도 작업으로 나눈다.
4. `/speckit-implement` 는 tasks 에 없는 파일을 고치지 않는다. 범위 밖 수정이 필요하면 멈추고
   spec·tasks 를 먼저 고친다.
5. 커밋은 Conventional Commit 접두사 + 한국어 요약, 한 커밋에 한 변경. Prisma 변경이 있으면
   마이그레이션 노트를, 화면 변경이 있으면 스크린샷을 PR·보고에 넣는다.
6. spec·plan 문서는 `docs/README.md` 규정과 원칙 VI(기밀 보호)를 함께 지킨다.

## Governance

- 이 헌법은 spec-kit 산출물(spec, plan, tasks, implement)의 판정 기준이다.
  명령·경로·환경 같은 운영 세부의 원본은 `AGENTS.md`, 시각 기준의 원본은 `DESIGN.md` 다.
  이 헌법과 그 문서가 충돌하면 그 문서를 따르고, 이 헌법을 PATCH 로 고친다.
- 사용자의 직접 지시는 이 헌법보다 우선한다. 다만 원칙 I·VI(NON-NEGOTIABLE)에서 벗어나는
  지시는 영향을 알린 뒤 진행한다.
- 개정 절차: `/speckit-constitution` 으로 고치고, 상단 Sync Impact Report 로 변경을 검토한 뒤
  커밋한다(커밋 전에 보고 주석은 지운다).
- 버전 규칙: 원칙 삭제·재정의는 MAJOR, 원칙·섹션 추가나 실질적 확장은 MINOR,
  문구 정리·사실 갱신은 PATCH.
- 준수 점검: 모든 plan 과 리뷰는 원칙 I~VII 위반 여부를 확인한다. 기술 스택이나 구조가 바뀌면
  (예: 라이브러리 도입, 인증 방식 변경) 같은 커밋에서 이 헌법도 갱신한다.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
