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

## 🎨 리스트 페이지 스타일 규칙

유사한 리스트 형태의 페이지 생성 시 아래 규칙을 따릅니다.
**참고 페이지**: `issues/page.tsx`, `customer-requirements/page.tsx`

### 페이지 레이아웃 구조

```tsx
<div className="p-6 space-y-6">
  {/* 1. 헤더 */}
  {/* 2. 프로젝트 미선택 안내 */}
  {/* 3. 통계 카드 */}
  {/* 4. 탭 */}
  {/* 5. 필터 바 */}
  {/* 6. 테이블 */}
  {/* 7. 모달들 */}
</div>
```

### 1. 헤더 스타일

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-xl font-bold text-white flex items-center gap-2">
      <Icon name="아이콘명" className="text-[#00f3ff]" />
      <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
        ENGLISH TITLE
      </span>
      <span className="text-slate-400 text-sm font-normal ml-1">
        / 한글 제목
      </span>
    </h1>
    <p className="text-text-secondary mt-1">설명 텍스트</p>
  </div>
  <div className="flex items-center gap-3">
    {/* 프로젝트 배지 */}
    {selectedProject && (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
        <Icon name="folder" size="sm" className="text-primary" />
        <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
      </div>
    )}
    {/* 버튼들: 엑셀 다운로드, Excel 가져오기, 새 항목 추가 순서 */}
    <Button variant="outline" leftIcon="download">엑셀 다운로드</Button>
    <Button variant="outline" leftIcon="upload">Excel 가져오기</Button>
    <Button variant="primary" leftIcon="add">새 항목 추가</Button>
  </div>
</div>
```

### 2. 통계 카드 (6열 그리드)

```tsx
<div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
  {/* 비율 카드 (프로그레스 바 포함) */}
  <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-2">
      <Icon name="speed" size="xs" className="text-primary" />
      <span className="text-xs font-semibold text-primary">비율명</span>
    </div>
    <p className="text-2xl font-bold text-primary mb-1">{rate}%</p>
    <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-primary to-success rounded-full" style={{ width: `${rate}%` }} />
    </div>
  </div>

  {/* 카운트 카드 */}
  <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon name="아이콘" size="xs" className="text-primary" />
      </div>
      <div>
        <p className="text-xl font-bold text-text dark:text-white">{count}</p>
        <p className="text-[10px] text-text-secondary">라벨</p>
      </div>
    </div>
  </div>

  {/* 특수 정보 카드 (여러 항목 표시) */}
  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-2">
      <Icon name="아이콘" size="xs" className="text-cyan-500" />
      <span className="text-xs font-semibold text-cyan-500">카드 제목</span>
    </div>
    <div className="flex items-center justify-between gap-1">
      {items.map(item => (
        <div className="text-center flex-1">
          <p className="text-sm font-bold text-text dark:text-white">{item.count}</p>
          <p className="text-[8px] text-text-secondary truncate">{item.label}</p>
        </div>
      ))}
    </div>
  </div>
</div>
```

### 3. 탭 스타일

```tsx
<div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg w-fit">
  <button
    onClick={() => setActiveTab("active")}
    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeTab === "active"
        ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
        : "text-text-secondary hover:text-text dark:hover:text-white"
    }`}
  >
    <Icon name="pending_actions" size="xs" />
    <span>활성 탭</span>
    <span className={`px-1.5 py-0.5 rounded text-xs ${
      activeTab === "active" ? "bg-primary/10 text-primary" : "bg-surface dark:bg-background-dark"
    }`}>
      {activeCount}
    </span>
  </button>
  {/* 추가 탭들... */}
</div>
```

### 4. 필터 바

```tsx
<div className="flex flex-wrap gap-4">
  <div className="w-64">
    <Input leftIcon="search" placeholder="검색..." value={search} onChange={...} />
  </div>
  <select className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white">
    <option value="all">전체</option>
    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
  </select>
</div>
```

### 5. 테이블 (Grid 레이아웃)

```tsx
<div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
  {/* 테이블 헤더 */}
  <div
    className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1200px]"
    style={{ gridTemplateColumns: "80px 100px 1fr 80px 50px" }}
  >
    <div>상태</div>
    <div>코드</div>
    <div>내용</div>
    <div>날짜</div>
    <div>수정</div>
  </div>

  {/* 빈 목록 */}
  {items.length === 0 && (
    <div className="p-8 text-center">
      <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
      <p className="text-text-secondary">등록된 항목이 없습니다.</p>
    </div>
  )}

  {/* 목록 아이템 */}
  {items.map(item => (
    <div
      key={item.id}
      className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1200px]"
      style={{ gridTemplateColumns: "80px 100px 1fr 80px 50px" }}
    >
      {/* 상태 배지 (클릭 시 드롭다운) */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(item.id)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          <Icon name={statusConfig.icon} size="xs" />
          <span>{statusConfig.label}</span>
        </button>
        {/* 드롭다운 메뉴 */}
      </div>
      {/* 나머지 컬럼들... */}
    </div>
  ))}
</div>
```

### 6. 상태 배지 드롭다운

```tsx
{openDropdown === item.id && (
  <>
    <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
    <div className="absolute left-0 top-full mt-1 z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]">
      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
        <button
          key={key}
          onClick={() => handleStatusChange(item.id, key)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
            item.status === key ? "bg-primary/5" : ""
          }`}
        >
          <Icon name={config.icon} size="xs" className={config.color} />
          <span className={config.color}>{config.label}</span>
          {item.status === key && <Icon name="check" size="xs" className="ml-auto text-primary" />}
        </button>
      ))}
    </div>
  </>
)}
```

### 7. 상태 설정 타입 (types.ts)

```typescript
/** 상태 설정 (아이콘, 색상 포함) */
export const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  PENDING: { label: "대기", icon: "pending", color: "text-warning", bgColor: "bg-warning/10" },
  ACTIVE: { label: "활성", icon: "check_circle", color: "text-success", bgColor: "bg-success/10" },
  COMPLETED: { label: "완료", icon: "done_all", color: "text-primary", bgColor: "bg-primary/10" },
  CANCELLED: { label: "취소", icon: "cancel", color: "text-error", bgColor: "bg-error/10" },
};
```

### 8. 공통 컴포넌트 사용

- **ImportExcelModal**: `@/components/common`에서 import
- **Icon, Button, Input**: `@/components/ui`에서 import
- **useProject**: `@/contexts`에서 프로젝트 컨텍스트

### 9. 필수 기능

1. ✅ 로딩 상태 (스피너)
2. ✅ 에러 상태 (에러 메시지)
3. ✅ 프로젝트 미선택 안내
4. ✅ 빈 목록 안내
5. ✅ 엑셀 다운로드
6. ✅ 엑셀 가져오기 (공통 모달)
7. ✅ 상태 클릭 드롭다운 변경
8. ✅ 수정/삭제 버튼

## 주의사항

1. **Prisma 스키마 변경 후**: 반드시 `npx prisma generate` 실행
2. **다크모드**: `dark:` 클래스와 함께 기본 라이트 모드 색상도 명시
3. **인증**: 모든 API는 `getAuthenticatedUser()` 로 인증 확인
4. **프로젝트 컨텍스트**: 대부분의 데이터는 `projectId`로 필터링

## 🚨 타입 동기화 규칙 (2026-01-13 학습) - 매우 중요!

### 근본 원인
이 프로젝트는 **타입 정의가 여러 곳에 분산**되어 있어서, 한 곳만 수정하면 빌드 오류가 발생합니다.

### 타입 정의 위치 (3단계 구조)
```
1. prisma/schema.prisma     ← DB 모델 (원본)
2. src/lib/api.ts           ← API 클라이언트 타입 (중간)
3. src/hooks/use*.ts        ← React Query 훅 타입 (최종)
```

### ⭐ 필수 동기화 체크리스트

**Prisma 스키마에 필드 추가/수정 시:**

1. ✅ `prisma/schema.prisma` 수정
2. ✅ `npx prisma generate` 실행
3. ✅ `src/lib/api.ts`의 해당 API 함수 타입 업데이트
   - `create` 함수 파라미터에 새 필드 추가
   - `update` 함수 파라미터에 새 필드 추가
4. ✅ `src/hooks/use*.ts`의 훅 타입도 함께 업데이트
   - `useCreate*` 훅의 `mutationFn` 타입
   - `useUpdate*` 훅의 `mutationFn` 타입

### 실제 발생했던 오류 예시

```typescript
// ❌ api.ts만 수정하고 훅은 수정 안 함
// api.ts
create: (data: { name: string; affiliation?: Affiliation }) => ...

// hooks/useUsers.ts - 여기도 수정해야 함!
mutationFn: (data: { name: string }) => api.users.create(data)
//                   ↑ affiliation 누락!
```

### 자주 놓치는 패턴

| 상황 | 수정해야 할 파일들 |
|------|-------------------|
| Equipment 필드 추가 | `api.ts` → `equipment.create/update` 타입 |
| User 필드 추가 | `api.ts` → `users.create/update` + `hooks/useUsers.ts` |
| Connection 필드 추가 | `api.ts` → `equipmentConnections.create` 타입 |

### TypeScript 타입 관련 추가 규칙

#### 1. filter(Boolean)은 타입을 좁히지 못함
```typescript
// ❌ 틀림 - TypeScript가 null/undefined 제거를 인식 못함
const lines = items.map(x => x.lineCode).filter(Boolean);
// 타입: (string | null | undefined)[]

// ✅ 올바름 - 타입 가드 사용
const lines = items.map(x => x.lineCode).filter((x): x is string => Boolean(x));
// 타입: string[]
```

#### 2. React Flow enum 값은 import 필수
```typescript
// ❌ 틀림 - 문자열 리터럴 사용
<ReactFlow selectionMode="partial" connectionMode="loose" />

// ✅ 올바름 - enum import 후 사용
import { SelectionMode, ConnectionMode } from "reactflow";
<ReactFlow
  selectionMode={SelectionMode.Partial}
  connectionMode={ConnectionMode.Loose}
/>
```

#### 3. select onChange에서 enum 타입 캐스팅
```typescript
// ❌ 틀림 - e.target.value는 string
onChange={(e) => setAffiliation(e.target.value)}

// ✅ 올바름 - 타입 캐스팅 필요
onChange={(e) => setAffiliation(e.target.value as Affiliation)}
```

### ❌ 절대 하지 말 것
- Prisma 스키마만 수정하고 api.ts 안 고침
- api.ts만 수정하고 훅 파일 안 고침
- 컴포넌트에서 새 필드 사용하면서 타입 확인 안 함
- filter(Boolean)으로 null 제거하고 타입 가드 안 씀

### ✅ 반드시 할 것
- 필드 추가 시 **3단계 모두** 확인 (schema → api.ts → hooks)
- 빌드 오류 발생 시 **타입 정의 분산** 여부 먼저 확인
- nullable 필드 필터링 시 타입 가드 사용
- 외부 라이브러리 enum은 import해서 사용

## Git 브랜치

- **main**: 메인 브랜치
- **romantic-hellman**: 현재 작업 브랜치 (worktree)
