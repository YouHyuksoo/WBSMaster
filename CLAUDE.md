# WBS Master - 프로젝트 가이드

## 프로젝트 개요

WBS Master는 **프로젝트 관리를 위한 WBS(Work Breakdown Structure) 도구**입니다.
Next.js 16 + React 19 기반의 풀스택 애플리케이션으로, Prisma ORM과 Supabase PostgreSQL을 사용합니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 16.1.1, React 19.2.3 |
| **언어** | TypeScript 5 |
| **스타일링** | Tailwind CSS 4 |
| **데이터베이스** | PostgreSQL (Supabase) |
| **ORM** | Prisma 7 |
| **상태 관리** | TanStack React Query 5 |
| **차트** | ECharts 5, Recharts 3 |
| **테스트** | Vitest |
| **AI 통합** | Google Gemini, Mistral |

## 디렉토리 구조

```
src/
├── app/
│   ├── (auth)/login/         # 로그인 페이지
│   ├── api/                  # API 라우트 (Next.js Route Handlers)
│   │   ├── auth/             # 인증 API
│   │   ├── projects/         # 프로젝트 CRUD
│   │   ├── tasks/            # 태스크 (칸반)
│   │   ├── wbs/              # WBS 항목
│   │   ├── requirements/     # 요구사항 점검표
│   │   ├── issues/           # 이슈사항
│   │   ├── members/          # 팀 멤버
│   │   ├── holidays/         # 일정/휴무 달력
│   │   ├── milestones/       # 마일스톤
│   │   ├── pinpoints/        # 핀포인트
│   │   ├── weekly-reports/   # 주간보고
│   │   ├── process-verification/ # 공정검증표
│   │   ├── chat/             # AI 채팅
│   │   └── ...
│   └── dashboard/            # 대시보드 페이지들
│       ├── page.tsx          # 메인 대시보드
│       ├── kanban/           # 칸반 보드
│       ├── wbs/              # WBS 관리
│       ├── requirements/     # 요구사항 점검표
│       ├── issues/           # 이슈사항 점검표
│       ├── milestones/       # 마일스톤 타임라인
│       ├── weekly-report/    # 주간보고
│       ├── process-verification/ # 공정검증표
│       ├── chat/             # AI 어시스턴트
│       └── ...
├── components/               # 공통 컴포넌트
├── lib/                      # 유틸리티 및 라이브러리
│   ├── prisma.ts             # Prisma 클라이언트
│   ├── auth.ts               # 인증 헬퍼
│   ├── api.ts                # API 클라이언트
│   ├── slack.ts              # Slack 웹훅
│   └── llm/                  # AI/LLM 관련
└── hooks/                    # 커스텀 훅
prisma/
└── schema.prisma             # 데이터베이스 스키마
scripts/                      # 유틸리티 스크립트
```

## 주요 기능

1. **WBS 관리** - 4단계 계층형 WBS (대분류 → 중분류 → 소분류 → 단위업무)
2. **칸반 보드** - 드래그앤드롭 태스크 관리
3. **요구사항 점검표** - 요구사항 추적 및 관리
4. **이슈사항 점검표** - 이슈 트래킹
5. **마일스톤 타임라인** - 프로젝트 일정 시각화
6. **핀포인트** - 주요 시점 마커
7. **주간보고** - 주차별 업무 보고서
8. **공정검증표** - MES 공정 검증 관리
9. **AI 어시스턴트** - 자연어 SQL 생성 및 데이터 분석
10. **휴무 달력** - 팀 일정 관리

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린트 검사
npm run lint

# 테스트 실행
npm run test

# 테스트 UI
npm run test:ui
```

## Prisma 명령어

```bash
# 스키마 변경 후 DB 동기화 (개발용)
npx prisma db push

# 마이그레이션 생성 및 적용
npx prisma migrate dev --name 변경내용설명

# Prisma Client 재생성 (스키마 변경 후 필수!)
npx prisma generate

# Prisma Studio (DB GUI)
npx prisma studio
```

## 데이터베이스 모델

### 핵심 모델

| 모델 | 설명 |
|------|------|
| `User` | 사용자 (이메일/비밀번호 인증) |
| `Project` | 프로젝트 |
| `WbsItem` | WBS 항목 (계층형) |
| `Task` | 칸반 태스크 |
| `Requirement` | 요구사항 |
| `Issue` | 이슈사항 |
| `Milestone` | 마일스톤 (기간 막대) |
| `Pinpoint` | 핀포인트 (시점 마커) |
| `TimelineRow` | 타임라인 행 |
| `WeeklyReport` | 주간보고 |
| `WeeklyReportItem` | 주간보고 항목 |
| `Holiday` | 일정/휴무 |
| `TeamMember` | 프로젝트 팀 멤버 |
| `ProcessVerificationCategory` | 공정검증 카테고리 |
| `ProcessVerificationItem` | 공정검증 항목 |

### 주요 Enum

- `UserRole`: ADMIN, USER, GUEST
- `ProjectStatus`: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
- `TaskStatus`: PENDING, IN_PROGRESS, HOLDING, DELAYED, COMPLETED, CANCELLED
- `WbsLevel`: LEVEL1, LEVEL2, LEVEL3, LEVEL4
- `MilestoneStatus`: PENDING, IN_PROGRESS, COMPLETED, DELAYED

## API 패턴

### Route Handler 예시

```typescript
// src/app/api/[resource]/route.ts
export async function GET(request: Request) {
  // 목록 조회
}

export async function POST(request: Request) {
  // 생성
}

// src/app/api/[resource]/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // 단건 조회
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // 수정
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // 삭제
}
```

## 코드 스타일 가이드

### 컴포넌트 작성

- **파일당 최대 200줄** 권장 (300줄 초과 시 반드시 분리)
- 페이지 컴포넌트는 `components/` 하위 폴더에 분리
- 관련 훅은 `hooks/` 폴더에 분리
- 타입 정의는 `types.ts`로 분리

### 폴더 구조 예시

```
src/app/dashboard/feature/
├── page.tsx              # 메인 페이지 (컴포넌트 조합만)
├── components/
│   ├── index.ts          # 컴포넌트 export
│   ├── FeatureHeader.tsx
│   ├── FeatureList.tsx
│   └── FeatureModal.tsx
├── hooks/
│   └── useFeature.ts
└── types.ts
```

### 주석 규칙 (JSDoc)

모든 파일에 JSDoc 주석 필수:

```typescript
/**
 * @file src/app/dashboard/feature/page.tsx
 * @description
 * 이 파일은 기능의 메인 페이지를 정의합니다.
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 설명
 * 2. **사용 방법**: 설명
 */
```

## 환경 변수

```env
# .env.local
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 주의사항

1. **Prisma 스키마 변경 후**: 반드시 `npx prisma generate` 실행
2. **다크모드**: `dark:` 클래스와 함께 기본 라이트 모드 색상도 명시
3. **인증**: 모든 API는 `getAuthenticatedUser()` 로 인증 확인
4. **프로젝트 컨텍스트**: 대부분의 데이터는 `projectId`로 필터링

## Git 브랜치

- **main**: 메인 브랜치
- **romantic-hellman**: 현재 작업 브랜치 (worktree)
