# 사용자/프로젝트 멤버십 관리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/users` 페이지를 좌(사용자)·우(프로젝트+멤버) 2컬럼으로 재구성하고, 기본적인 프로젝트 접근 권한 가드를 도입한다.

**Architecture:** 기존 `TeamMember` 모델을 활용한다(스키마 변경 없음). 새 헬퍼 `assertProjectAccess`로 API 가드를 일관 적용하고, ADMIN-only 페이지로 사용자/프로젝트 멤버십을 통합 관리한다. 기존 `/dashboard/users` 컴포넌트가 862줄로 너무 비대하므로 components/ 폴더로 분할한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, React Query 5, Tailwind 4, Vitest

**관련 디자인 문서:** `docs/superpowers/specs/2026-05-14-users-projects-membership-design.md`

---

## 파일 구조

### 신규 파일
```
src/app/dashboard/users/
├── components/
│   ├── index.ts                       # barrel export
│   ├── UserListPanel.tsx              # 좌측 사용자 패널
│   ├── UserListRow.tsx                # 좌측 사용자 행
│   ├── UserFormModal.tsx              # 사용자 추가/수정 모달
│   ├── ProjectListPanel.tsx           # 우측 상단 프로젝트 패널
│   ├── ProjectListRow.tsx             # 우측 프로젝트 행
│   ├── ProjectFormModal.tsx           # 프로젝트 생성 모달
│   ├── MemberSection.tsx              # 우측 하단 멤버 섹션
│   └── MemberRow.tsx                  # 멤버 행 + 역할 인라인 편집
├── hooks/
│   └── useBulkInviteMembers.ts        # 일괄 멤버 추가 훅
├── constants.ts                       # ROLE/AFFILIATION 라벨
└── types.ts                           # 공통 타입

src/lib/__tests__/
└── auth.test.ts                       # assertProjectAccess 단위 테스트
```

### 수정 파일
```
src/lib/auth.ts                                  # assertProjectAccess 추가
src/app/api/projects/route.ts                    # GET 인증 + 필터링
src/app/api/projects/[id]/route.ts               # GET/PATCH/DELETE 가드
src/app/api/members/route.ts                     # GET/POST 가드
src/app/api/members/[id]/route.ts                # 모든 메서드 가드
src/app/api/progress-tasks/route.ts              # GET/POST 가드
src/app/api/progress-tasks/[id]/route.ts         # GET/PATCH/DELETE 가드
src/app/api/progress-tasks/export/route.ts       # 가드
src/app/api/progress-tasks/import/route.ts       # 가드
src/app/dashboard/users/page.tsx                 # 좌/우 2컬럼 재조립
src/app/dashboard/page.tsx                       # "새 프로젝트" 제거
src/components/layout/DashboardSidebar.tsx       # 메뉴 라벨 변경 + ADMIN 가드
src/lib/api.ts                                   # projects.list 시그니처 확장
```

---

## Task 1: `assertProjectAccess` 헬퍼 (TDD)

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/__tests__/auth.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

`src/lib/__tests__/auth.test.ts`:

```typescript
/**
 * @file src/lib/__tests__/auth.test.ts
 * @description assertProjectAccess 헬퍼의 권한 판단 로직 단위 테스트
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";

// prisma 모킹
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");
const { assertProjectAccess } = await import("@/lib/auth");

const adminUser: AuthUser = {
  id: "u-admin",
  email: "a@a.com",
  name: "관리자",
  avatar: null,
  role: "ADMIN",
};

const normalUser: AuthUser = {
  id: "u-1",
  email: "u@u.com",
  name: "일반",
  avatar: null,
  role: "USER",
};

describe("assertProjectAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADMIN은 멤버십 검사 없이 통과한다", async () => {
    const result = await assertProjectAccess("p-1", adminUser);
    expect(result).toBeNull();
    expect(prisma.teamMember.findUnique).not.toHaveBeenCalled();
  });

  it("일반 사용자가 멤버인 경우 통과한다", async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue({ id: "m-1" });
    const result = await assertProjectAccess("p-1", normalUser);
    expect(result).toBeNull();
  });

  it("일반 사용자가 비멤버인 경우 403 응답을 반환한다", async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue(null);
    const result = await assertProjectAccess("p-1", normalUser);
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.status).toBe(403);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run src/lib/__tests__/auth.test.ts`
Expected: FAIL with `assertProjectAccess is not a function`

- [ ] **Step 3: `assertProjectAccess` 구현**

`src/lib/auth.ts` 파일 끝에 추가:

```typescript
import { prisma } from "@/lib/prisma";

/**
 * 프로젝트 접근 권한 검사
 * ADMIN이거나 해당 프로젝트의 TeamMember이면 통과, 아니면 403 반환
 *
 * @example
 * const guard = await assertProjectAccess(projectId, user);
 * if (guard) return guard;
 */
export async function assertProjectAccess(
  projectId: string,
  user: AuthUser
): Promise<NextResponse | null> {
  if (user.role === "ADMIN") return null;

  const membership = await prisma.teamMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "프로젝트에 접근할 권한이 없습니다." },
      { status: 403 }
    );
  }
  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/__tests__/auth.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/auth.ts src/lib/__tests__/auth.test.ts
git commit -m "feat(auth): assertProjectAccess 헬퍼 추가"
```

---

## Task 2: `/api/projects` GET에 인증 + accessibleOnly 필터

**Files:**
- Modify: `src/app/api/projects/route.ts:35-243`
- Modify: `src/lib/api.ts:1076-1085`

- [ ] **Step 1: 서버 라우트 수정**

`src/app/api/projects/route.ts` GET 핸들러를 다음으로 교체:

```typescript
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const ownerId = searchParams.get("ownerId");
    const accessibleOnly = searchParams.get("accessibleOnly") !== "false"; // 기본 true

    const where: Prisma.ProjectWhereInput = {};

    if (status && Object.values(ProjectStatus).includes(status)) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    // accessibleOnly: ADMIN은 전체, 그 외는 멤버십 보유 프로젝트만
    if (accessibleOnly && user!.role !== "ADMIN") {
      where.teamMembers = { some: { userId: user!.id } };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        wbsItems: {
          select: { id: true, parentId: true, level: true, progress: true, weight: true, status: true },
        },
        _count: { select: { tasks: true, requirements: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 이하 진행률 계산 로직은 기존 유지 (line 104~226)
    // ... (기존 projectsWithCalculatedProgress 계산 그대로)
```

기존 진행률 계산 로직(line 110~226)은 변경 없이 그대로 둔다. 응답 형태 동일.

- [ ] **Step 2: 디버깅 로그 제거**

같은 파일에서 `console.log("===== [DEBUG]...` 시작하는 디버깅 로그(38-42, 100-102, 230-235행)를 제거한다. 권한 가드 도입과 함께 정리.

- [ ] **Step 3: 클라이언트 API 타입 확장**

`src/lib/api.ts:1076-1085`의 `projects.list` 시그니처 수정:

```typescript
projects: {
  list: (params?: { status?: string; ownerId?: string; accessibleOnly?: boolean }) =>
    get<Project[]>("/api/projects", params),
  // 나머지 동일
},
```

`useProjects` 훅도 같은 옵션 받도록 `src/hooks/useProjects.ts:37` 수정:

```typescript
export function useProjects(filters?: { status?: string; ownerId?: string; accessibleOnly?: boolean }) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => api.projects.list(filters),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
```

- [ ] **Step 4: 타입 체크 + 빌드**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/projects/route.ts src/lib/api.ts src/hooks/useProjects.ts
git commit -m "feat(api): projects GET에 인증 + accessibleOnly 필터링"
```

---

## Task 3: `/api/projects/[id]` 라우트 가드

**Files:**
- Modify: `src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: 라우트 핸들러 3개 모두에 가드 추가**

GET/PATCH/DELETE 핸들러 각각의 시작 부분에 인증 + 멤버십 가드를 추가한다. 예시:

```typescript
import { requireAuth, assertProjectAccess } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    const accessError = await assertProjectAccess(id, user!);
    if (accessError) return accessError;

    // 기존 로직 그대로
```

PATCH, DELETE에도 동일 패턴 적용.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/projects/[id]/route.ts
git commit -m "feat(api): projects/[id] 라우트에 멤버십 가드 적용"
```

---

## Task 4: `/api/members` 라우트 가드

**Files:**
- Modify: `src/app/api/members/route.ts`
- Modify: `src/app/api/members/[id]/route.ts`

- [ ] **Step 1: members 컬렉션 라우트에 가드 추가**

`src/app/api/members/route.ts` GET 핸들러:

```typescript
import { requireAuth, assertProjectAccess } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // projectId가 지정된 경우 그 프로젝트 접근 권한 검사
    if (projectId) {
      const accessError = await assertProjectAccess(projectId, user!);
      if (accessError) return accessError;
    } else if (user!.role !== "ADMIN") {
      // projectId 없이 전체 멤버 조회는 ADMIN만 가능
      return NextResponse.json({ error: "프로젝트 ID가 필요합니다." }, { status: 400 });
    }

    // 기존 prisma.teamMember.findMany 로직 그대로
```

POST 핸들러:

```typescript
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { projectId, userId, role, customRole, department, position } = body;

    if (!projectId || !userId) {
      return NextResponse.json({ error: "프로젝트 ID와 사용자 ID는 필수입니다." }, { status: 400 });
    }

    // 멤버 추가는 ADMIN 또는 해당 프로젝트의 OWNER/MANAGER만 가능
    if (user!.role !== "ADMIN") {
      const myMembership = await prisma.teamMember.findUnique({
        where: { projectId_userId: { projectId, userId: user!.id } },
        select: { role: true },
      });
      if (!myMembership || (myMembership.role !== "OWNER" && myMembership.role !== "MANAGER")) {
        return NextResponse.json({ error: "멤버를 추가할 권한이 없습니다." }, { status: 403 });
      }
    }

    // 기존 로직(프로젝트/사용자 존재 확인, 중복 확인, 생성)은 그대로
```

- [ ] **Step 2: members/[id] 라우트에 가드 추가**

`src/app/api/members/[id]/route.ts` GET/PATCH/DELETE 각각 시작 부분에:

```typescript
import { requireAuth, assertProjectAccess } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // 멤버 레코드를 조회해서 그 projectId에 대한 접근 권한 검사
    const existing = await prisma.teamMember.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "팀 멤버를 찾을 수 없습니다." }, { status: 404 });
    }

    const accessError = await assertProjectAccess(existing.projectId, user!);
    if (accessError) return accessError;

    // 기존 findUnique 다시 호출하지 않고 별도 변수로 처리하거나 기존 로직 재사용
```

PATCH/DELETE도 동일한 패턴으로 시작.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/members/
git commit -m "feat(api): members 라우트에 인증 + 멤버십 가드 적용"
```

---

## Task 5: `/api/progress-tasks` 라우트 가드

**Files:**
- Modify: `src/app/api/progress-tasks/route.ts`
- Modify: `src/app/api/progress-tasks/[id]/route.ts`
- Modify: `src/app/api/progress-tasks/export/route.ts`
- Modify: `src/app/api/progress-tasks/import/route.ts`

- [ ] **Step 1: 컬렉션 라우트**

`src/app/api/progress-tasks/route.ts`의 GET/POST 각각:

```typescript
import { requireAuth, assertProjectAccess } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
  }

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  // 기존 로직
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
  }

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  // 기존 로직
}
```

- [ ] **Step 2: 단건 라우트**

`src/app/api/progress-tasks/[id]/route.ts` GET/PATCH/DELETE 각각 시작 부분에:

```typescript
import { requireAuth, assertProjectAccess } from "@/lib/auth";

// 핸들러 내부에서 task를 먼저 조회해 projectId 확보:
const existing = await prisma.progressTask.findUnique({
  where: { id },
  select: { projectId: true },
});
if (!existing) {
  return NextResponse.json({ error: "task not found" }, { status: 404 });
}

const accessError = await assertProjectAccess(existing.projectId, user!);
if (accessError) return accessError;
```

기존에 이미 task를 조회하는 부분이 있다면 그 결과를 활용해 중복 조회 피한다.

- [ ] **Step 3: export/import 라우트**

`src/app/api/progress-tasks/export/route.ts`와 `import/route.ts` 각각:

```typescript
const { user, error: authError } = await requireAuth();
if (authError) return authError;

const projectId = /* 기존 코드에서 projectId 추출 위치 */;

const accessError = await assertProjectAccess(projectId, user!);
if (accessError) return accessError;
```

- [ ] **Step 4: 타입 체크 + 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/progress-tasks/
git commit -m "feat(api): progress-tasks 라우트에 인증 + 멤버십 가드 적용"
```

---

## Task 6: 현재 사용자 정보 훅

**Files:**
- Create: `src/hooks/useCurrentUser.ts`
- Modify: `src/hooks/index.ts` (export 추가)

- [ ] **Step 1: 훅 작성**

`src/hooks/useCurrentUser.ts`:

```typescript
/**
 * @file src/hooks/useCurrentUser.ts
 * @description 현재 로그인한 사용자 정보 조회 훅
 *
 * 초보자 가이드:
 * 1. **session API**: /api/auth/session에서 받아옴
 * 2. **권한 체크**: user.role === "ADMIN" 판정에 사용
 */
import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "ADMIN" | "USER" | "GUEST";
}

export const currentUserKeys = {
  all: ["currentUser"] as const,
};

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: currentUserKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return null;
      const data = await res.json();
      return data.user ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
```

- [ ] **Step 2: /api/auth/session 엔드포인트 확인**

Run: `ls src/app/api/auth/`
이미 session 라우트가 있다면 그대로 사용. 없다면 다음 단계로 추가.

- [ ] **Step 3 (조건부): session 라우트 추가 (없는 경우만)**

`src/app/api/auth/session/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  return NextResponse.json({ user });
}
```

- [ ] **Step 4: hooks/index.ts에 export 추가**

`src/hooks/index.ts`에 추가:

```typescript
export { useCurrentUser, currentUserKeys, type CurrentUser } from "./useCurrentUser";
```

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/hooks/useCurrentUser.ts src/hooks/index.ts src/app/api/auth/session/
git commit -m "feat(hooks): useCurrentUser 훅 추가"
```

---

## Task 7: 사이드바 메뉴 정리 및 ADMIN 가드

**Files:**
- Modify: `src/components/layout/DashboardSidebar.tsx:71-80`

- [ ] **Step 1: 메뉴 라벨 변경, 중복 항목 제거, ADMIN 플래그 추가**

`src/components/layout/DashboardSidebar.tsx`에서 `MenuItem` 타입과 `managementItems` 수정:

```typescript
interface MenuItem {
  label: string;
  icon: string;
  href: string;
  filled?: boolean;
  adminOnly?: boolean;  // 추가
}

const managementItems: MenuItem[] = [
  { label: "기준 설정", icon: "tune", href: "/dashboard/settings" },
  { label: "사용자/프로젝트 관리", icon: "manage_accounts", href: "/dashboard/users", adminOnly: true },
  // "/dashboard/members" 항목 제거 (사용자/프로젝트 관리로 통합됨)
  { label: "채팅 분석", icon: "analytics", href: "/dashboard/chat/history" },
  { label: "업무협조 점검표", icon: "checklist", href: "/dashboard/requirements" },
  { label: "이슈사항 점검표", icon: "bug_report", href: "/dashboard/issues" },
  { label: "Slack 설정", icon: "forum", href: "/dashboard/slack" },
  { label: "데이터 백업", icon: "backup", href: "/dashboard/backups" },
];
```

- [ ] **Step 2: 컴포넌트에서 useCurrentUser로 ADMIN 가드 적용**

`DashboardSidebar`에서 메뉴 렌더링 부분에 필터링 추가. 컴포넌트 본문 상단에:

```typescript
import { useCurrentUser } from "@/hooks";

// ... 컴포넌트 안:
const { data: currentUser } = useCurrentUser();
const isAdmin = currentUser?.role === "ADMIN";

const visibleManagementItems = managementItems.filter(
  (item) => !item.adminOnly || isAdmin
);
```

기존에 `managementItems.map(...)` 호출하는 부분을 `visibleManagementItems.map(...)`로 교체.

- [ ] **Step 3: 시각적 점검**

Run: `npm run dev` 후 브라우저에서 `/dashboard` 확인.
- ADMIN으로 로그인 → "사용자/프로젝트 관리" 메뉴 보임, "프로젝트 멤버" 사라짐
- 일반 USER로 로그인 → "사용자/프로젝트 관리" 안 보임

- [ ] **Step 4: 커밋**

```bash
git add src/components/layout/DashboardSidebar.tsx
git commit -m "feat(sidebar): 사용자/프로젝트 관리로 메뉴 통합 + ADMIN 가드"
```

---

## Task 8: 대시보드 메인의 "새 프로젝트" 제거

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: 관련 상태 + 모달 + 버튼 제거**

`src/app/dashboard/page.tsx`에서 다음을 모두 제거:

1. `const [showCreateModal, setShowCreateModal] = useState(false);` 및 관련 폼 상태(`newProjectName` 등)
2. line 709-712의 "새 프로젝트" 버튼
3. line 788-792 근처의 빈 상태에서 "프로젝트 생성" 버튼
4. line 932 이후의 생성 모달 전체
5. `useCreateProject` 임포트 (다른 곳에서 안 쓰면)

빈 상태 안내는 다음으로 교체:

```tsx
<p className="text-text-secondary mb-4">
  먼저 사용자/프로젝트 관리 페이지에서 프로젝트를 생성해주세요.
</p>
```

ADMIN 사용자에게는 사용자/프로젝트 관리 페이지로 가는 링크를 추가해도 좋다.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 시각적 점검**

Run: `npm run dev` 후 `/dashboard` 진입. "새 프로젝트" 버튼이 더 이상 보이지 않는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): 메인에서 프로젝트 생성 기능 제거"
```

---

## Task 9: `/dashboard/users` 상수 + 타입 추출

**Files:**
- Create: `src/app/dashboard/users/constants.ts`
- Create: `src/app/dashboard/users/types.ts`

- [ ] **Step 1: constants.ts 작성**

`src/app/dashboard/users/constants.ts`:

```typescript
/**
 * @file src/app/dashboard/users/constants.ts
 * @description 사용자/프로젝트 관리 페이지의 라벨/스타일 상수
 */

/** 시스템 역할 설정 */
export const USER_ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  ADMIN: { label: "관리자", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", description: "모든 기능 접근 가능" },
  USER: { label: "사용자", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", description: "기본 기능 사용" },
  GUEST: { label: "손님", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30", description: "읽기 전용" },
};

/** 소속 설정 */
export const AFFILIATION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  CLIENT:      { label: "고객사",   color: "text-purple-600 dark:text-purple-400",   bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  DEVELOPER:   { label: "개발사",   color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  CONSULTING:  { label: "컨설팅",   color: "text-amber-600 dark:text-amber-400",     bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  OUTSOURCING: { label: "외주",     color: "text-cyan-600 dark:text-cyan-400",       bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  HAENGSUNG:   { label: "행성사",   color: "text-blue-600 dark:text-blue-400",       bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  OTHER:       { label: "기타",     color: "text-slate-600 dark:text-slate-400",     bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

/** 프로젝트 멤버 역할 설정 */
export const MEMBER_ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  OWNER:   { label: "소유자",   color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  MANAGER: { label: "관리자",   color: "text-blue-600 dark:text-blue-400",     bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  MEMBER:  { label: "멤버",     color: "text-slate-600 dark:text-slate-400",   bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

/** 프로젝트 상태 설정 */
export const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PLANNING:  { label: "계획",   color: "text-blue-600 dark:text-blue-400",   bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  ACTIVE:    { label: "진행중", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  ON_HOLD:   { label: "보류",   color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  COMPLETED: { label: "완료",   color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  CANCELLED: { label: "취소",   color: "text-red-600 dark:text-red-400",     bgColor: "bg-red-100 dark:bg-red-900/30" },
};
```

- [ ] **Step 2: types.ts 작성**

`src/app/dashboard/users/types.ts`:

```typescript
/**
 * @file src/app/dashboard/users/types.ts
 * @description 사용자/프로젝트 관리 페이지의 로컬 타입
 */
import type { User, Project, TeamMember } from "@/lib/api";

export interface UserFormState {
  email: string;
  name: string;
  role: string;
  affiliation: string | null;
  avatar: string;
  password: string;
}

export interface ProjectFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export type { User, Project, TeamMember };
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/users/constants.ts src/app/dashboard/users/types.ts
git commit -m "refactor(users): constants + types 파일 분리"
```

---

## Task 10: `UserFormModal` 컴포넌트 추출

**Files:**
- Create: `src/app/dashboard/users/components/UserFormModal.tsx`
- Modify: `src/app/dashboard/users/page.tsx` (모달 부분 제거 후 사용처 교체는 Task 14에서)

- [ ] **Step 1: 모달 컴포넌트 작성**

`src/app/dashboard/users/components/UserFormModal.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/UserFormModal.tsx
 * @description 사용자 추가/수정 모달
 *
 * 초보자 가이드:
 * 1. **mode**: "create" or "edit"
 * 2. **editingUser**: edit 모드일 때 초기값
 * 3. **onSuccess**: 성공 시 콜백 (모달 닫기 등)
 */
"use client";

import { useState, useEffect } from "react";
import { Icon, Button, Input, ImageCropper, useToast } from "@/components/ui";
import { useCreateUser, useUpdateUser } from "@/hooks";
import type { Affiliation, User } from "@/lib/api";
import { USER_ROLE_CONFIG, AFFILIATION_CONFIG } from "../constants";

interface Props {
  mode: "create" | "edit";
  isOpen: boolean;
  editingUser?: User | null;
  onClose: () => void;
}

export function UserFormModal({ mode, isOpen, editingUser, onClose }: Props) {
  const toast = useToast();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("USER");
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // edit 모드 초기화
  useEffect(() => {
    if (mode === "edit" && editingUser) {
      setEmail(editingUser.email);
      setName(editingUser.name || "");
      setRole(editingUser.role);
      setAffiliation(editingUser.affiliation || null);
      setAvatar(editingUser.avatar || "");
      setPassword("");
    } else if (mode === "create" && isOpen) {
      setEmail("");
      setName("");
      setRole("USER");
      setAffiliation(null);
      setAvatar("");
      setPassword("");
    }
  }, [mode, editingUser, isOpen]);

  const handleImageCropComplete = async (blob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드 실패");
      }
      const { url } = await res.json();
      setAvatar(url);
      setShowImageCropper(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.", "업로드 실패");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }
    try {
      if (mode === "create") {
        await createUser.mutateAsync({
          email,
          name: name || undefined,
          avatar: avatar || undefined,
          affiliation: affiliation || undefined,
        });
        toast.success("사용자가 등록되었습니다.");
      } else if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          data: {
            email,
            name: name || undefined,
            role,
            avatar: avatar || undefined,
            affiliation: affiliation || undefined,
            password: password.trim() !== "" ? password : undefined,
          },
        });
        toast.success("사용자 정보가 저장되었습니다.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.", "저장 실패");
    }
  };

  if (!isOpen) return null;

  const isLoading = mode === "create" ? createUser.isPending : updateUser.isPending;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text dark:text-white">
              {mode === "create" ? "사용자 추가" : "사용자 수정"}
            </h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text dark:hover:text-white">
              <Icon name="close" size="md" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {avatar ? (
                  <img src={avatar} alt="아바타" className="size-24 rounded-full object-cover border-2 border-border dark:border-border-dark" />
                ) : (
                  <div className="size-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                    {name?.charAt(0) || email?.charAt(0) || "?"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowImageCropper(true)}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Icon name="add_a_photo" size="md" className="text-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowImageCropper(true)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
                disabled={isUploadingImage}
              >
                <Icon name="edit" size="xs" />
                {isUploadingImage ? "업로드 중..." : mode === "create" ? "사진 설정" : "사진 변경"}
              </button>
              {mode === "edit" && avatar && (
                <button type="button" onClick={() => setAvatar("")} className="text-xs text-error hover:underline">
                  사진 제거
                </button>
              )}
            </div>

            <Input label="이메일 *" leftIcon="email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="이름" leftIcon="person" placeholder="사용자 이름" value={name} onChange={(e) => setName(e.target.value)} />

            {mode === "edit" && (
              <div>
                <Input label="비밀번호 (변경 시에만 입력)" leftIcon="lock" type="password" placeholder="변경하지 않으려면 비워두세요" value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="text-xs text-text-secondary mt-1">비밀번호를 변경하지 않으려면 비워두세요.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">소속</label>
              <select
                value={affiliation || ""}
                onChange={(e) => setAffiliation((e.target.value as Affiliation) || null)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                <option value="">선택 안함</option>
                {Object.entries(AFFILIATION_CONFIG).map(([aff, config]) => (
                  <option key={aff} value={aff}>{config.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text dark:text-white mb-2">시스템 역할</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
              >
                {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label} - {config.description}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" fullWidth onClick={onClose}>취소</Button>
              <Button variant="primary" fullWidth type="submit" disabled={isLoading}>
                {isLoading ? "저장 중..." : mode === "create" ? "등록" : "저장"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {showImageCropper && (
        <ImageCropper
          onCropComplete={handleImageCropComplete}
          onClose={() => setShowImageCropper(false)}
          onError={(message) => toast.error(message, "이미지 오류")}
          aspectRatio={1}
          cropShape="round"
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/users/components/UserFormModal.tsx
git commit -m "refactor(users): UserFormModal 컴포넌트 추출"
```

---

## Task 11: `UserListRow` + `UserListPanel`

**Files:**
- Create: `src/app/dashboard/users/components/UserListRow.tsx`
- Create: `src/app/dashboard/users/components/UserListPanel.tsx`

- [ ] **Step 1: UserListRow 작성**

`src/app/dashboard/users/components/UserListRow.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/UserListRow.tsx
 * @description 좌측 사용자 1행 (체크박스 + 정보 + 수정/삭제 아이콘)
 */
"use client";

import { Icon } from "@/components/ui";
import type { User } from "@/lib/api";
import { USER_ROLE_CONFIG, AFFILIATION_CONFIG } from "../constants";

interface Props {
  user: User;
  checked: boolean;
  onToggle: () => void;
  membershipCount: number;
  isAlreadyMemberOfSelectedProject: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function UserListRow({
  user, checked, onToggle, membershipCount,
  isAlreadyMemberOfSelectedProject, onEdit, onDelete,
}: Props) {
  const role = USER_ROLE_CONFIG[user.role] || USER_ROLE_CONFIG.USER;
  const aff = user.affiliation ? AFFILIATION_CONFIG[user.affiliation] : null;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors ${
        isAlreadyMemberOfSelectedProject ? "opacity-50" : ""
      }`}
      title={isAlreadyMemberOfSelectedProject ? "이미 멤버" : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={isAlreadyMemberOfSelectedProject}
        className="size-4"
      />
      {user.avatar ? (
        <img src={user.avatar} alt={user.name || ""} className="size-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="size-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
          {user.name?.charAt(0) || user.email.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text dark:text-white truncate">{user.name || "이름 없음"}</div>
        <div className="text-xs text-text-secondary truncate">{user.email}</div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1">
          {aff && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${aff.bgColor} ${aff.color}`}>{aff.label}</span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${role.bgColor} ${role.color}`}>{role.label}</span>
        </div>
        <span className="text-[10px] text-text-secondary">참여 {membershipCount}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="수정">
          <Icon name="edit" size="sm" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="삭제">
          <Icon name="delete" size="sm" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: UserListPanel 작성**

`src/app/dashboard/users/components/UserListPanel.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/UserListPanel.tsx
 * @description 좌측 사용자 패널 — 검색/필터/목록/일괄 추가
 */
"use client";

import { useState, useMemo } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useUsers } from "@/hooks";
import type { User, TeamMember } from "@/lib/api";
import { USER_ROLE_CONFIG } from "../constants";
import { UserListRow } from "./UserListRow";

interface Props {
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  selectedProjectId: string | null;
  selectedProjectMembers: TeamMember[];
  onBulkAdd: () => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  /** userId → 참여 프로젝트 수 */
  membershipCountByUserId: Map<string, number>;
}

export function UserListPanel({
  selectedUserIds, onToggleUser, selectedProjectId, selectedProjectMembers,
  onBulkAdd, onAddUser, onEditUser, onDeleteUser, membershipCountByUserId,
}: Props) {
  const { data: users = [], isLoading } = useUsers();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const memberUserIds = useMemo(
    () => new Set(selectedProjectMembers.map((m) => m.userId)),
    [selectedProjectMembers]
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

  const eligibleSelectedCount = selectedUserIds.filter((id) => !memberUserIds.has(id)).length;

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col h-full">
      <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-text dark:text-white">사용자</h2>
          <Button variant="primary" size="sm" leftIcon="person_add" onClick={onAddUser}>
            추가
          </Button>
        </div>
        <div className="flex gap-2">
          <Input leftIcon="search" placeholder="이름/이메일 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
          >
            <option value="all">전체 역할</option>
            {Object.entries(USER_ROLE_CONFIG).map(([key, c]) => (
              <option key={key} value={key}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="group_off" size="xl" className="mb-3" />
            <p>일치하는 사용자가 없습니다.</p>
          </div>
        ) : (
          filtered.map((u) => (
            <UserListRow
              key={u.id}
              user={u}
              checked={selectedUserIds.includes(u.id)}
              onToggle={() => onToggleUser(u.id)}
              membershipCount={membershipCountByUserId.get(u.id) ?? 0}
              isAlreadyMemberOfSelectedProject={!!selectedProjectId && memberUserIds.has(u.id)}
              onEdit={() => onEditUser(u)}
              onDelete={() => onDeleteUser(u)}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-border dark:border-border-dark">
        <Button
          variant="primary"
          fullWidth
          leftIcon="add"
          onClick={onBulkAdd}
          disabled={!selectedProjectId || eligibleSelectedCount === 0}
        >
          {selectedProjectId
            ? `선택 사용자 ${eligibleSelectedCount}명 일괄 추가 →`
            : "프로젝트를 먼저 선택하세요"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/users/components/UserListRow.tsx src/app/dashboard/users/components/UserListPanel.tsx
git commit -m "refactor(users): UserListPanel + UserListRow 컴포넌트 추출"
```

---

## Task 12: `ProjectFormModal` + `ProjectListRow` + `ProjectListPanel`

**Files:**
- Create: `src/app/dashboard/users/components/ProjectFormModal.tsx`
- Create: `src/app/dashboard/users/components/ProjectListRow.tsx`
- Create: `src/app/dashboard/users/components/ProjectListPanel.tsx`

- [ ] **Step 1: ProjectFormModal 작성**

`src/app/dashboard/users/components/ProjectFormModal.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/ProjectFormModal.tsx
 * @description 프로젝트 생성 모달 (대시보드 메인에서 옮겨옴)
 */
"use client";

import { useState } from "react";
import { Icon, Button, Input, useToast } from "@/components/ui";
import { useCreateProject } from "@/hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

export function ProjectFormModal({ isOpen, onClose, onCreated }: Props) {
  const toast = useToast();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("프로젝트 이름을 입력해주세요.");
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success("프로젝트가 생성되었습니다.");
      setName(""); setDescription(""); setStartDate(""); setEndDate("");
      onCreated?.(project.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성 실패", "프로젝트 생성 실패");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text dark:text-white">새 프로젝트</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text dark:hover:text-white">
            <Icon name="close" size="md" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="이름 *" leftIcon="folder" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className="block text-sm font-medium text-text dark:text-white mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="시작일" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="종료일" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={onClose}>취소</Button>
            <Button variant="primary" fullWidth type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "생성 중..." : "생성"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

`useCreateProject` 훅이 `src/hooks`에 export 돼 있는지 확인. 없으면 `src/hooks/useProjects.ts`의 export를 살펴보고 추가.

- [ ] **Step 2: ProjectListRow 작성**

`src/app/dashboard/users/components/ProjectListRow.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/ProjectListRow.tsx
 * @description 우측 프로젝트 행
 */
"use client";

import type { Project } from "@/lib/api";
import { PROJECT_STATUS_CONFIG } from "../constants";

interface Props {
  project: Project & { teamMembers?: unknown[] };
  selected: boolean;
  onSelect: () => void;
}

export function ProjectListRow({ project, selected, onSelect }: Props) {
  const status = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.PLANNING;
  const memberCount = Array.isArray(project.teamMembers) ? project.teamMembers.length : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2 border-b border-border dark:border-border-dark transition-colors text-left ${
        selected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-surface/50 dark:hover:bg-surface-dark/50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text dark:text-white truncate">{project.name}</div>
        {project.description && (
          <div className="text-xs text-text-secondary truncate">{project.description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
        <span className="text-[10px] text-text-secondary">{memberCount}명</span>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: ProjectListPanel 작성**

`src/app/dashboard/users/components/ProjectListPanel.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/ProjectListPanel.tsx
 * @description 우측 상단 프로젝트 패널 — 검색/생성/선택
 */
"use client";

import { useState, useMemo } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useProjects } from "@/hooks";
import { ProjectListRow } from "./ProjectListRow";

interface Props {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export function ProjectListPanel({ selectedProjectId, onSelectProject, onCreateProject }: Props) {
  // ADMIN 페이지이므로 전체 프로젝트 조회
  const { data: projects = [], isLoading } = useProjects({ accessibleOnly: false });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  }, [projects, search]);

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col">
      <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-text dark:text-white">프로젝트</h2>
          <Button variant="primary" size="sm" leftIcon="add" onClick={onCreateProject}>
            추가
          </Button>
        </div>
        <Input leftIcon="search" placeholder="프로젝트 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="max-h-[40vh] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="folder_off" size="xl" className="mb-3" />
            <p>프로젝트가 없습니다.</p>
          </div>
        ) : (
          filtered.map((p) => (
            <ProjectListRow
              key={p.id}
              project={p}
              selected={p.id === selectedProjectId}
              onSelect={() => onSelectProject(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/app/dashboard/users/components/ProjectFormModal.tsx src/app/dashboard/users/components/ProjectListRow.tsx src/app/dashboard/users/components/ProjectListPanel.tsx
git commit -m "refactor(users): 프로젝트 패널 + 생성 모달 컴포넌트 추가"
```

---

## Task 13: `MemberRow` + `MemberSection`

**Files:**
- Create: `src/app/dashboard/users/components/MemberRow.tsx`
- Create: `src/app/dashboard/users/components/MemberSection.tsx`

- [ ] **Step 1: MemberRow 작성**

`src/app/dashboard/users/components/MemberRow.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/MemberRow.tsx
 * @description 멤버 행 — 역할 인라인 편집 + 제거
 */
"use client";

import { Icon } from "@/components/ui";
import { useUpdateMember, useRemoveMember } from "@/hooks";
import type { TeamMember } from "@/lib/api";
import { MEMBER_ROLE_CONFIG } from "../constants";

interface Props {
  member: TeamMember;
  currentUserId: string;
  onRequestRemove: (member: TeamMember) => void;
}

export function MemberRow({ member, currentUserId, onRequestRemove }: Props) {
  const update = useUpdateMember();
  const roleConfig = MEMBER_ROLE_CONFIG[member.role] || MEMBER_ROLE_CONFIG.MEMBER;
  const isSelfOwner = member.userId === currentUserId && member.role === "OWNER";

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border dark:border-border-dark hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors">
      {member.user?.avatar ? (
        <img src={member.user.avatar} alt={member.user.name || ""} className="size-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="size-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-text dark:text-white truncate">
          {member.user?.name || "이름 없음"}
        </div>
        <div className="text-xs text-text-secondary truncate">{member.user?.email}</div>
      </div>
      <select
        value={member.role}
        onChange={(e) => update.mutate({ id: member.id, data: { role: e.target.value } })}
        className={`px-2 py-1 rounded text-xs font-medium ${roleConfig.bgColor} ${roleConfig.color} border-0 cursor-pointer`}
      >
        {Object.entries(MEMBER_ROLE_CONFIG).map(([key, c]) => (
          <option key={key} value={key}>{c.label}</option>
        ))}
      </select>
      <button
        onClick={() => onRequestRemove(member)}
        disabled={isSelfOwner}
        className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={isSelfOwner ? "본인이 OWNER인 경우 제거할 수 없습니다" : "멤버 제거"}
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: MemberSection 작성**

`src/app/dashboard/users/components/MemberSection.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/components/MemberSection.tsx
 * @description 우측 하단 — 선택된 프로젝트의 멤버 목록
 */
"use client";

import { useState } from "react";
import { Icon, ConfirmModal, useToast } from "@/components/ui";
import { useMembers, useRemoveMember, useCurrentUser } from "@/hooks";
import type { TeamMember, Project } from "@/lib/api";
import { MemberRow } from "./MemberRow";

interface Props {
  project: Project | null;
}

export function MemberSection({ project }: Props) {
  const toast = useToast();
  const { data: currentUser } = useCurrentUser();
  const { data: members = [], isLoading } = useMembers(project ? { projectId: project.id } : undefined);
  const remove = useRemoveMember();

  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    try {
      await remove.mutateAsync(removingMember.id);
      toast.success(`${removingMember.user?.name || "멤버"} 제거 완료`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "제거 실패");
    } finally {
      setRemovingMember(null);
    }
  };

  if (!project) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center text-text-secondary">
        <Icon name="touch_app" size="xl" className="mb-3" />
        <p>위에서 프로젝트를 선택하세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col">
      <div className="p-4 border-b border-border dark:border-border-dark">
        <h3 className="font-bold text-text dark:text-white">
          {project.name} 멤버 <span className="text-text-secondary text-sm font-normal">({members.length}명)</span>
        </h3>
      </div>
      <div className="max-h-[40vh] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-text-secondary">로딩 중...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="group_off" size="xl" className="mb-3" />
            <p>등록된 멤버가 없습니다.</p>
            <p className="text-xs mt-1">좌측에서 사용자를 선택해 추가하세요.</p>
          </div>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              currentUserId={currentUser?.id ?? ""}
              onRequestRemove={(member) => setRemovingMember(member)}
            />
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!removingMember}
        title="멤버 제거"
        message={`"${removingMember?.user?.name || "멤버"}"를 이 프로젝트에서 제거하시겠습니까?`}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemovingMember(null)}
        confirmText="제거"
        cancelText="취소"
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/users/components/MemberRow.tsx src/app/dashboard/users/components/MemberSection.tsx
git commit -m "refactor(users): MemberSection + MemberRow 컴포넌트 추가"
```

---

## Task 14: 일괄 추가 훅 + barrel export

**Files:**
- Create: `src/app/dashboard/users/hooks/useBulkInviteMembers.ts`
- Create: `src/app/dashboard/users/components/index.ts`

- [ ] **Step 1: 일괄 추가 훅 작성**

`src/app/dashboard/users/hooks/useBulkInviteMembers.ts`:

```typescript
/**
 * @file src/app/dashboard/users/hooks/useBulkInviteMembers.ts
 * @description 여러 사용자를 한 프로젝트에 일괄 멤버로 추가
 *
 * 초보자 가이드:
 * - 결과: { added, skipped, failed } 카운트
 * - 이미 멤버인 경우는 서버에서 400 에러 → skipped로 분류
 * - 그 외 에러는 failed
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { memberKeys } from "@/hooks/useMembers";

interface BulkResult {
  added: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export function useBulkInviteMembers() {
  const queryClient = useQueryClient();

  return useMutation<BulkResult, Error, { projectId: string; userIds: string[]; role?: string }>({
    mutationFn: async ({ projectId, userIds, role }) => {
      const result: BulkResult = { added: 0, skipped: 0, failed: 0, errors: [] };

      for (const userId of userIds) {
        try {
          await api.members.create({ projectId, userId, role: role || "MEMBER" });
          result.added++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("이미 프로젝트")) {
            result.skipped++;
          } else {
            result.failed++;
            result.errors.push(msg);
          }
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
```

- [ ] **Step 2: 컴포넌트 barrel export**

`src/app/dashboard/users/components/index.ts`:

```typescript
export { UserFormModal } from "./UserFormModal";
export { UserListPanel } from "./UserListPanel";
export { UserListRow } from "./UserListRow";
export { ProjectListPanel } from "./ProjectListPanel";
export { ProjectListRow } from "./ProjectListRow";
export { ProjectFormModal } from "./ProjectFormModal";
export { MemberSection } from "./MemberSection";
export { MemberRow } from "./MemberRow";
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/dashboard/users/hooks/useBulkInviteMembers.ts src/app/dashboard/users/components/index.ts
git commit -m "feat(users): 일괄 멤버 추가 훅 + 컴포넌트 barrel export"
```

---

## Task 15: `/dashboard/users/page.tsx` 재조립

**Files:**
- Modify: `src/app/dashboard/users/page.tsx` (전체 교체)

- [ ] **Step 1: page.tsx 전체 교체**

`src/app/dashboard/users/page.tsx`:

```typescript
/**
 * @file src/app/dashboard/users/page.tsx
 * @description 사용자/프로젝트 관리 — ADMIN 전용 페이지
 *
 * 초보자 가이드:
 * 1. **좌측**: 사용자 목록, 체크박스 다중선택
 * 2. **우측 상단**: 프로젝트 목록, 클릭으로 선택
 * 3. **우측 하단**: 선택된 프로젝트의 멤버 + 역할 인라인 편집
 * 4. **일괄 추가**: 좌측 체크 → 우측 프로젝트 선택 → [일괄 추가]
 */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, ConfirmModal, useToast } from "@/components/ui";
import {
  useUsers, useDeleteUser, useCurrentUser, useMembers, useProjects,
} from "@/hooks";
import type { User, Project } from "@/lib/api";
import {
  UserListPanel, UserFormModal,
  ProjectListPanel, ProjectFormModal,
  MemberSection,
} from "./components";
import { useBulkInviteMembers } from "./hooks/useBulkInviteMembers";

export default function UsersPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: users = [] } = useUsers();
  const { data: projects = [] } = useProjects({ accessibleOnly: false });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [userModalState, setUserModalState] = useState<
    { mode: "create" } | { mode: "edit"; user: User } | null
  >(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const deleteUser = useDeleteUser();
  const bulkInvite = useBulkInviteMembers();

  const { data: selectedProjectMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // userId → 참여 프로젝트 수
  const membershipCountByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      const members = (p as Project & { teamMembers?: { userId: string }[] }).teamMembers || [];
      for (const m of members) {
        map.set(m.userId, (map.get(m.userId) ?? 0) + 1);
      }
    }
    return map;
  }, [projects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // 권한 가드
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-6 rounded-lg max-w-md mx-auto text-center">
          <Icon name="lock" size="xl" className="mb-3" />
          <p className="font-bold mb-2">관리자 전용 페이지입니다.</p>
          <p className="text-sm mb-4">이 페이지에 접근할 권한이 없습니다.</p>
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>대시보드로 이동</Button>
        </div>
      </div>
    );
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkAdd = async () => {
    if (!selectedProjectId || selectedUserIds.length === 0) return;
    try {
      const result = await bulkInvite.mutateAsync({
        projectId: selectedProjectId,
        userIds: selectedUserIds,
      });
      const parts: string[] = [];
      if (result.added > 0) parts.push(`${result.added}명 추가`);
      if (result.skipped > 0) parts.push(`${result.skipped}명 이미 멤버`);
      if (result.failed > 0) parts.push(`${result.failed}명 실패`);
      toast.success(parts.join(" · "));
      if (result.failed > 0) {
        console.error("일괄 추가 실패 상세:", result.errors);
      }
      setSelectedUserIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "일괄 추가 실패");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      toast.success("사용자가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-white">사용자/프로젝트 관리</h1>
          <p className="text-text-secondary mt-1">사용자 · 프로젝트 · 멤버십을 한 곳에서 관리합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측 사용자 패널 */}
        <UserListPanel
          selectedUserIds={selectedUserIds}
          onToggleUser={handleToggleUser}
          selectedProjectId={selectedProjectId}
          selectedProjectMembers={selectedProjectMembers}
          onBulkAdd={handleBulkAdd}
          onAddUser={() => setUserModalState({ mode: "create" })}
          onEditUser={(user) => setUserModalState({ mode: "edit", user })}
          onDeleteUser={(user) => setDeletingUser(user)}
          membershipCountByUserId={membershipCountByUserId}
        />

        {/* 우측: 프로젝트 + 멤버 섹션 */}
        <div className="space-y-6">
          <ProjectListPanel
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={() => setProjectModalOpen(true)}
          />
          <MemberSection project={selectedProject} />
        </div>
      </div>

      {/* 모달들 */}
      <UserFormModal
        mode={userModalState?.mode || "create"}
        isOpen={!!userModalState}
        editingUser={userModalState?.mode === "edit" ? userModalState.user : null}
        onClose={() => setUserModalState(null)}
      />

      <ProjectFormModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onCreated={(id) => setSelectedProjectId(id)}
      />

      <ConfirmModal
        isOpen={!!deletingUser}
        title="사용자 삭제"
        message={`"${deletingUser?.name || "사용자"}"를 삭제하시겠습니까?\n\n관련된 프로젝트 멤버십도 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUser(null)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. 만약 `useCreateProject`가 hooks에서 export 안 됐다면 다음 단계 처리.

- [ ] **Step 3: useCreateProject export 확인 및 추가**

`src/hooks/useProjects.ts`에 `useCreateProject` 훅이 있는지 확인. 없다면:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { projectKeys } from "./useProjects";

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; startDate?: string; endDate?: string }) =>
      api.projects.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
```

`src/hooks/index.ts`에 export 추가.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build` 또는 `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 5: 시각적 점검**

Run: `npm run dev`
- `/dashboard/users` 진입 (ADMIN으로 로그인 상태)
- 좌측 사용자 체크, 우측 프로젝트 선택, [일괄 추가] 동작 확인
- 멤버 행의 역할 드롭다운, [×] 동작 확인
- 새 프로젝트 [+추가] 모달 동작 확인
- 일반 USER로 로그인 → 차단 화면 확인

- [ ] **Step 6: 커밋**

```bash
git add src/app/dashboard/users/page.tsx src/hooks/
git commit -m "feat(users): 사용자/프로젝트 관리 페이지 재조립"
```

---

## Task 16: 회귀 점검 + 마무리

- [ ] **Step 1: 전체 테스트 통과**

Run: `npx vitest run`
Expected: 모든 테스트 통과

- [ ] **Step 2: 빌드 통과**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 3: 진도 리스크 페이지 회귀 점검**

브라우저에서:
- ADMIN 로그인 → `/dashboard/progress-risk` 진입, 자기가 멤버인 프로젝트 선택 시 정상 동작
- 일반 USER로 멤버 아닌 프로젝트 ID로 직접 API 호출 → 403 응답

수동 확인:

```bash
# 일반 USER 세션 쿠키 사용
curl -H "Cookie: userId=<USER_ID>" "http://localhost:3000/api/progress-tasks?projectId=<NON_MEMBER_PROJECT>"
# Expected: {"error":"프로젝트에 접근할 권한이 없습니다."} (403)
```

- [ ] **Step 4: /dashboard/members 페이지 검토**

기존 `/dashboard/members` 페이지는 사이드바에서 빠졌지만 파일은 남아있다. URL 직접 접근 시 동작하므로:
- 옵션 A (이번 PR): 그대로 둠. 사이드바에서만 빠짐. 후속 정리는 별도.
- 옵션 B: 페이지 파일을 삭제하거나 `/dashboard/users`로 리다이렉트.

이 계획에서는 옵션 A를 채택. 후속에 정리.

- [ ] **Step 5: 최종 커밋 (필요 시)**

회귀 점검 중 발견된 사소한 수정이 있다면 별도 커밋.

```bash
# 예시: 추가 수정 사항
git add <변경 파일들>
git commit -m "fix(users): 회귀 점검 후 사소한 수정"
```

---

## 자체 검토 메모

**스펙 커버리지:**
- ✓ 좌/우 2컬럼 + 멤버 섹션 (Tasks 10-15)
- ✓ 일괄 추가 (Task 14)
- ✓ 멤버 역할 인라인 편집 (Task 13)
- ✓ 권한 가드 — assertProjectAccess + 적용 (Tasks 1-5)
- ✓ ADMIN 가드 — 페이지 + 사이드바 (Tasks 7, 15)
- ✓ 대시보드 메인 정리 (Task 8)
- ✓ /dashboard/members 사이드바 제거 (Task 7)
- ✓ OWNER 본인 [×] 비활성화 (Task 13 MemberRow)

**범위에서 제외된 항목 (디자인 문서 명시):**
- `/api/tasks`, `/api/wbs`, `/api/requirements`, `/api/issues` 등 다른 프로젝트 종속 API의 가드 — 후속 PR
- /dashboard/members 페이지 파일 삭제 — 후속

**유의사항:**
- Task 5에서 진도 리스크 API 가드를 적용하면, 자기가 멤버 아닌 프로젝트의 데이터를 보던 일반 USER는 403을 받게 된다. 운영자가 ADMIN이라면 영향 없음.
- Task 8에서 대시보드 메인의 빈 상태 안내 문구는 "사용자/프로젝트 관리 페이지에서 생성"으로 바뀌어, 일반 USER는 ADMIN에게 요청해야 한다.
