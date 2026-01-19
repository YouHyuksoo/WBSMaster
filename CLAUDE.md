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

## 🚨 Supabase Storage RLS 규칙 (2026-01-13 학습) - 매우 중요!

### 핵심 문제
이 프로젝트는 **자체 인증 시스템(Prisma User + bcrypt)**을 사용하고, **Supabase Auth를 사용하지 않음**.
따라서 Supabase Storage에서 `authenticated` 역할로 인식되지 않아 RLS 정책이 실패함.

### 증상
```
StorageApiError: new row violates row-level security policy (403)
```

### 원인
- Supabase Storage RLS 정책이 `authenticated` 역할에만 적용됨
- 자체 인증 사용 시 Supabase에서는 `anon` (익명) 역할로 인식
- 서버 사이드 API에서 Storage 업로드 시 사용자 세션이 전달되지 않음

### ✅ 해결 방법

**Supabase 대시보드에서 Storage RLS 정책 수정:**

1. **Storage** → **Policies** → 해당 버킷 (예: `avatars`)
2. INSERT/UPDATE/DELETE 정책의 **Applied to**를 `authenticated` → `public`으로 변경
3. 또는 새로운 public 정책 추가

**현재 avatars 버킷 정책 (수정 후):**
| 정책 이름 | Command | Applied to |
|-----------|---------|------------|
| avatars_public_read | SELECT | public |
| avatars_authenticated_insert | INSERT | **public** (수정됨) |
| avatars_authenticated_update | UPDATE | **public** (수정됨) |
| avatars_authenticated_delete | DELETE | **public** (수정됨) |

### 클라이언트 직접 업로드 방식

서버 API(`/api/upload`)를 거치지 않고 클라이언트에서 직접 Supabase Storage에 업로드:

```typescript
import { createClient } from "@/lib/supabase/client";

const handleUpload = async (blob: Blob, userId: string) => {
  const supabase = createClient();
  const fileName = `${Date.now()}.jpg`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return publicUrl;
};
```

### ❌ 절대 하지 말 것
- RLS 정책이 `authenticated`인 상태에서 자체 인증으로 업로드 시도
- 서버 사이드에서 ANON_KEY로 Storage 업로드 (세션 전달 안 됨)

### ✅ 반드시 할 것
- 새 Storage 버킷 생성 시 RLS 정책을 `public`으로 설정
- 업로드 실패 시 RLS 정책 Applied to 확인

## Git 브랜치

- **main**: 메인 브랜치
- **romantic-hellman**: 현재 작업 브랜치 (worktree)

## 🚨 엑셀 데이터 변환 가이드 (2026-01-18 학습) - 매우 중요!

### 핵심 원칙
엑셀 데이터를 DB에 입력할 때는 **스크립트 방식**을 사용하고, **Prisma 7 adapter 설정**을 반드시 포함해야 함.

### 성공한 스크립트 템플릿

**파일 위치**: `scripts/import-*.ts`

```typescript
/**
 * 엑셀 데이터 가져오기 스크립트 템플릿
 * 실행: npx tsx scripts/import-xxx.ts
 */

// 1. 환경변수 먼저 로드 (필수!)
import { config } from "dotenv";
config({ path: ".env.local" });

// 2. Prisma 7 adapter 설정 (필수!)
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as XLSX from "xlsx";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 3. 매핑 테이블 정의 (엑셀 값 → DB Enum)
const CATEGORY_MAP: Record<string, string> = {
  "기준관리": "MASTER",
  "생산관리": "PRODUCTION",
  // ... 모든 매핑 정의
};

async function main() {
  // 4. 엑셀 파일 읽기
  const workbook = XLSX.readFile("파일경로.xlsx");
  const sheet = workbook.Sheets["시트명"];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | null)[][];

  // 5. 데이터 파싱 (병합 셀 처리!)
  let currentCategory = "";
  for (let i = 헤더행수; i < rawData.length; i++) {
    const row = rawData[i];
    // 대분류/중분류 병합 셀 처리
    if (row[0]) currentCategory = String(row[0]).trim();
    // ...
  }

  // 6. 기존 데이터 삭제 후 재입력 (권장)
  await prisma.model.deleteMany({ where: { parentId } });

  // 7. 새 데이터 생성
  for (const item of items) {
    await prisma.model.create({ data: item });
  }
}

// 8. 정리 (pool도 종료!)
main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

### ⭐ 필수 체크리스트

**스크립트 작성 시:**

1. ✅ `dotenv` 환경변수 로드 (`config({ path: ".env.local" })`)
2. ✅ Prisma 7 adapter 설정 (`PrismaPg` + `Pool`)
3. ✅ 엑셀 값 → DB Enum 매핑 테이블 정의
4. ✅ 병합 셀 처리 (currentMajor, currentMiddle 변수 유지)
5. ✅ 전각 공백("　") 처리 (`.trim()` 사용)
6. ✅ pool.end() 호출 (finally에서)

**새 Enum 값 추가 시:**

1. ✅ `prisma/schema.prisma` - enum에 값 추가
2. ✅ `src/app/dashboard/.../types.ts` - 타입에 값 추가
3. ✅ `src/app/dashboard/.../constants.ts` - 라벨/아이콘 추가
4. ✅ `npx prisma db push` 실행
5. ✅ `npx prisma generate` 실행
6. ✅ **개발 서버 재시작** (중요! 안 하면 Enum 오류 발생)

### 엑셀 구조 분석 방법

```javascript
// 먼저 헤더와 샘플 데이터 확인
const XLSX = require('xlsx');
const workbook = XLSX.readFile('파일.xlsx');
console.log('시트 목록:', workbook.SheetNames);

const sheet = workbook.Sheets['시트명'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('헤더:', data[0]);
console.log('샘플:', data.slice(1, 10));
```

### 흔한 실수

| 실수 | 해결 방법 |
|------|-----------|
| `PrismaClient needs valid options` | dotenv 로드 + adapter 설정 |
| `Value 'X' not found in enum` | Enum 추가 후 **서버 재시작** |
| 데이터 누락 | 병합 셀 처리 (이전 값 유지) |
| 빈 값이 "　"로 저장 | `.trim()` 후 빈 문자열 체크 |
| 매핑 안 됨 | 매핑 테이블에 모든 값 정의 |

### ❌ 절대 하지 말 것

- `new PrismaClient()` 직접 호출 (adapter 없이)
- curl로 API 호출 시도 (인증 필요)
- Enum 추가 후 서버 재시작 안 함
- 매핑 테이블에 새 카테고리 누락

### ✅ 반드시 할 것

- 스크립트 방식으로 데이터 입력
- 환경변수 + adapter 설정 포함
- 모든 엑셀 값에 대한 매핑 정의
- Enum 변경 시 **3곳 수정 + 서버 재시작**

## 🚀 AS-IS 분석 데이터 마이그레이션 가이드 (2026-01-18 학습)

### 개요
AS-IS 분석 시스템은 **사업부별(V_IVI, V_PCBA, V_DISP, V_HNS)** 데이터를 관리하며,
엑셀 파일에서 데이터를 가져와 DB에 저장합니다.

### 핵심 스크립트 패턴

**파일 위치**: `scripts/import-as-is-{사업부명}.ts`

```typescript
/**
 * @file scripts/import-as-is-{사업부명}.ts
 * @description
 * {사업부명} 사업부 AS-IS 분석 데이터 가져오기 스크립트
 * 실행: npx tsx scripts/import-as-is-{사업부명}.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as XLSX from "xlsx";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECT_ID = "프로젝트ID";
const BUSINESS_UNIT = "V_사업부명"; // V_IVI, V_PCBA, V_DISP, V_HNS

// 대분류 매핑 (엑셀 → Enum)
const MAJOR_CATEGORY_MAP: Record<string, string> = {
  "기준관리": "MASTER",
  "생산관리": "PRODUCTION",
  "품질관리": "QUALITY",
  "자재관리": "MATERIAL",
  "설비관리": "EQUIPMENT",
  "재고관리": "INVENTORY",
  "출하관리": "SHIPMENT",
};

// 현행방식 매핑
const CURRENT_METHOD_MAP: Record<string, string> = {
  "GMES": "SYSTEM",
  "GERP": "SYSTEM",
  "ERP": "SYSTEM",
  "MES": "SYSTEM",
  "수기": "MANUAL",
  "엑셀": "EXCEL",
  "Excel": "EXCEL",
};

async function main() {
  console.log("🚀 {사업부명} AS-IS 데이터 가져오기 시작...\n");

  // 1. 엑셀 파일 읽기
  const filePath = "엑셀파일경로.xlsx";
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["{시트명}"];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | null | undefined)[][];

  // 2. 데이터 파싱 (병합 셀 처리!)
  const items = [];
  let currentMajor = "";
  let currentMiddle = "";

  for (let i = 2; i < rawData.length; i++) { // 3번째 행부터 데이터
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const [major, middle, managementNo, taskName, department, details, system, issue, remarks] = row;

    // 병합 셀 처리: 대분류/중분류가 비어있으면 이전 값 유지
    if (major) currentMajor = String(major).trim();
    if (middle) currentMiddle = String(middle).trim();

    if (!taskName) continue; // 업무명이 없으면 스킵

    // 현행방식 자동 판단
    let currentMethod = "MANUAL";
    if (system) {
      const systemStr = String(system).trim().toUpperCase();
      if (systemStr.includes("GMES") || systemStr.includes("MES")) {
        currentMethod = "SYSTEM";
      } else if (systemStr.includes("GERP") || systemStr.includes("ERP")) {
        currentMethod = "SYSTEM";
      } else if (systemStr.includes("엑셀") || systemStr.includes("EXCEL")) {
        currentMethod = "EXCEL";
      } else if (systemStr.includes("수기")) {
        currentMethod = "MANUAL";
      } else if (systemStr.length > 0) {
        currentMethod = "SYSTEM";
      }
    }

    items.push({
      asIsManagementNo: managementNo ? String(managementNo).trim() : "",
      majorCategory: MAJOR_CATEGORY_MAP[currentMajor] || "MASTER", // 기본값 MASTER
      middleCategory: currentMiddle || "기타",
      taskName: String(taskName).trim(),
      currentMethod,
      details: details ? String(details).trim() : "",
      issueSummary: issue ? String(issue).trim() : "",
      remarks: remarks ? String(remarks).trim() : "",
    });
  }

  console.log(`📊 파싱된 항목 수: ${items.length}개\n`);

  // 3. Overview 확인 또는 생성
  let overview = await prisma.asIsOverview.findFirst({
    where: { projectId: PROJECT_ID, businessUnit: BUSINESS_UNIT },
  });

  if (!overview) {
    overview = await prisma.asIsOverview.create({
      data: {
        projectId: PROJECT_ID,
        businessUnit: BUSINESS_UNIT,
        customerName: "고객명",
        author: "시스템 가져오기",
        createdDate: new Date(),
      },
    });
    console.log(`✅ Overview 생성 완료: ${overview.id}\n`);
  } else {
    // 기존 항목 삭제 후 재입력
    const deleted = await prisma.asIsOverviewItem.deleteMany({
      where: { overviewId: overview.id },
    });
    console.log(`🗑️ 기존 항목 ${deleted.count}개 삭제\n`);
  }

  // 4. 항목 생성
  console.log("📝 항목 생성 중...");
  let order = 0;
  for (const item of items) {
    await prisma.asIsOverviewItem.create({
      data: {
        overviewId: overview.id,
        asIsManagementNo: item.asIsManagementNo || null,
        majorCategory: item.majorCategory as never,
        middleCategory: item.middleCategory,
        taskName: item.taskName,
        currentMethod: item.currentMethod as never,
        details: item.details || null,
        issueSummary: item.issueSummary || null,
        remarks: item.remarks || null,
        order: order++,
      },
    });
    process.stdout.write(".");
  }

  console.log(`\n\n✅ 완료! ${items.length}개 항목이 입력되었습니다.`);
}

main()
  .catch((e) => {
    console.error("❌ 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

### 실행 방법

```bash
# 각 사업부별 스크립트 실행
npx tsx scripts/import-as-is-vivi.ts
npx tsx scripts/import-as-is-pcba.ts
npx tsx scripts/import-as-is-disp.ts
npx tsx scripts/import-as-is-hns.ts
```

### 데이터 구조

| 엑셀 컬럼 | DB 필드 | 비고 |
|----------|---------|------|
| 대분류 | majorCategory | 병합 셀 - 이전 값 유지 |
| 중분류 | middleCategory | 병합 셀 - 이전 값 유지 |
| 관리번호 | asIsManagementNo | 옵션 |
| 업무명 | taskName | 필수 |
| 담당부서 | - | 사용 안 함 |
| 세부내용 | details | 옵션 |
| 현행시스템 | currentMethod | 자동 판단 (SYSTEM/MANUAL/EXCEL) |
| 이슈사항 | issueSummary | 옵션 |
| 비고 | remarks | 옵션 |

### ⭐ 핵심 포인트

1. **병합 셀 처리**: 대분류/중분류가 비어있으면 이전 값(`currentMajor`, `currentMiddle`) 유지
2. **데이터 시작 행**: 3번째 행(index 2)부터 데이터 시작 (1-2행은 헤더)
3. **기본값 설정**: 매핑 안 되는 대분류는 `MASTER`로 설정 (`|| "MASTER"`)
4. **안전한 재실행**: 기존 데이터 삭제 후 재입력하여 중복 방지
5. **사업부 분리**: `businessUnit` 필드로 각 사업부 데이터 구분

### 데이터 수정 스크립트

이미 입력된 데이터를 수정할 때 사용:

```typescript
// scripts/fix-other-to-master.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECT_ID = "프로젝트ID";

async function main() {
  console.log("🔧 대분류 OTHER → MASTER 변경 시작...\n");

  const businessUnits = ["V_PCBA", "V_DISP", "V_HNS"];

  for (const businessUnit of businessUnits) {
    const overview = await prisma.asIsOverview.findFirst({
      where: { projectId: PROJECT_ID, businessUnit },
    });

    if (!overview) continue;

    const result = await prisma.asIsOverviewItem.updateMany({
      where: { overviewId: overview.id, majorCategory: "OTHER" },
      data: { majorCategory: "MASTER" },
    });

    console.log(`✅ ${businessUnit}: ${result.count}개 변경`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

### 사업부 상수 수정

사업부 코드 변경 시 (예: V_HMS → V_HNS):

**파일들:**
1. `src/constants/business-units.ts` - BUSINESS_UNITS 배열
2. `src/app/dashboard/as-is-analysis/types.ts` - 주석의 사업부 목록

### ❌ 흔한 실수

| 실수 | 해결 방법 |
|------|-----------|
| 데이터가 "기타" 대분류로 들어감 | 기본값을 `"OTHER"` → `"MASTER"`로 수정 |
| 병합 셀 데이터 누락 | `currentMajor`, `currentMiddle` 변수로 이전 값 유지 |
| 중복 데이터 생성 | 재실행 시 기존 항목 먼저 삭제 |
| 사업부 코드 오타 | constants 파일에서 상수로 관리 |

### ✅ 체크리스트

- [ ] 엑셀 파일 경로 확인
- [ ] 시트명 확인 (V_IVI, V_PCBA, V_DISP, V_HNS)
- [ ] 프로젝트 ID 확인
- [ ] 대분류 매핑 테이블에 모든 값 포함
- [ ] 기본값을 MASTER로 설정 (`|| "MASTER"`)
- [ ] 병합 셀 처리 로직 포함
- [ ] pool.end() 호출 확인
- [ ] 실행 후 웹에서 데이터 확인
