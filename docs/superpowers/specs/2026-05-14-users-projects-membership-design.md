# 사용자/프로젝트 멤버십 관리 — 디자인 문서

작성일: 2026-05-14
범위: `/dashboard/users` 페이지 개편 + 프로젝트 접근 권한 제어

## 1. 배경 및 목표

### 현재 상태
- `/dashboard/users`는 시스템 사용자 CRUD만 담당
- `/dashboard` 메인과 `/dashboard/projects` 페이지에서 프로젝트 생성 가능
- `TeamMember` 모델, `/api/members` CRUD API, `useMembers/useInviteMember` 훅이 이미 구현되어 있으나 통합 관리 화면이 없음
- `ProjectContext` 및 대부분의 프로젝트 종속 API에 권한 가드가 없음 — 로그인한 사용자가 자신이 속하지 않은 프로젝트 데이터에 접근 가능

### 목표
1. `/dashboard/users` 페이지에서 **사용자와 프로젝트와 멤버십**을 한 화면에서 관리
2. 사용자가 자신이 속한 프로젝트의 데이터만 접근하도록 권한 제어
3. 프로젝트 생성 입구를 정리 — 대시보드 메인에서 제거, 관리 페이지와 `/dashboard/projects`에서만 유지

### 비목표
- 새로운 멤버십 모델 도입 (기존 `TeamMember` 그대로 사용)
- 권한 시스템 전면 개편 — 본 작업은 "ADMIN이거나 멤버인 경우 접근 허용"이라는 단일 규칙만 적용
- 초대 메일/외부 사용자 초대 워크플로

## 2. 데이터 모델

기존 `TeamMember` 모델을 그대로 사용한다. 변경 없음.

```prisma
model TeamMember {
  id         String         @id @default(uuid())
  role       TeamMemberRole @default(MEMBER)   // OWNER / MANAGER / MEMBER
  customRole String?                            // 분석자, 개발자 등
  department String?
  position   String?
  projectId  String
  userId     String
  @@unique([projectId, userId])
}
```

## 3. UI — `/dashboard/users` 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ 사용자/프로젝트 관리                                            │
├─────────────────────────────────┬────────────────────────────┤
│ 사용자 [+추가] [검색] [역할필터]   │ 프로젝트 [+추가] [검색]      │
│                                  │                            │
│ ☐ 🟢 김분석    CLIENT   참여 2  │ ▶ 프로젝트 A  ACTIVE  3명   │
│ ☐ 🔵 박개발   DEVELOPER 참여 1  │   프로젝트 B  PLANNING 1명  │
│ ☐ 🟡 이테스터 DEVELOPER 참여 0  │   프로젝트 C  ACTIVE  2명   │
│                                  ├────────────────────────────┤
│  [✓ 일괄 추가 →]                 │ 프로젝트 A 멤버 (3명)        │
│                                  │  김분석  [분석자▼] [×]       │
│                                  │  박개발  [개발자▼] [×]       │
│                                  │  이테스터 [테스터▼] [×]      │
└─────────────────────────────────┴────────────────────────────┘
```

### 인터랙션

| 액션 | 동작 |
|---|---|
| 좌측 사용자 행 클릭 | 체크박스 토글 |
| 좌측 [+추가] | 기존 사용자 추가 모달 (변경 없음) |
| 좌측 사용자 행 수정/삭제 아이콘 | 기존 모달 (변경 없음) |
| 좌측 [일괄 추가 →] | 선택된 사용자 전원을 우측 선택 프로젝트에 `MEMBER` 역할로 추가. 이미 멤버인 경우 스킵하고 안내 토스트. |
| 우측 프로젝트 행 클릭 | 그 프로젝트가 선택 상태가 되고 하단 멤버 섹션이 그 프로젝트 멤버로 갱신 |
| 우측 [+추가] | 새 프로젝트 생성 모달 (대시보드 메인 모달과 동일 폼) |
| 멤버 행의 역할 드롭다운 | 인라인으로 OWNER/MANAGER/MEMBER 변경. 즉시 PATCH. |
| 멤버 행의 [×] | 확인 다이얼로그 → 멤버 제거 |

### 표시 요소

- 좌측 사용자 행의 "참여 N개" 칩 — 그 사용자가 멤버로 등록된 프로젝트 수. `_count` 쿼리로 받는다.
- 우측 프로젝트 행의 "N명" 칩 — 그 프로젝트의 멤버 수.
- 좌측에서 체크된 사용자 중 우측 선택 프로젝트에 이미 멤버인 경우 → 회색 처리 + 툴팁 "이미 멤버"

### 페이지 가드

- ADMIN만 메뉴 노출 및 페이지 진입 가능
- 일반 USER가 URL로 직접 진입 시 "관리자만 접근 가능합니다" 안내 + 대시보드로 리다이렉트 버튼

## 4. 권한 제어 — "자기 프로젝트만 접근"

### 4-1. 접근 가능 프로젝트 정의

```
ADMIN 사용자 → 모든 프로젝트
USER/GUEST 사용자 → 자신이 TeamMember로 등록된 프로젝트만
```

### 4-2. 적용 지점

#### (a) `/api/projects` GET — 인증 + 필터링

- `requireAuth()` 추가
- 쿼리 파라미터 `accessibleOnly=true` (기본값) 도입
- ADMIN이 아니고 `accessibleOnly=true`이면 `where.teamMembers.some.userId = me` 필터 추가
- 관리 페이지는 ADMIN 전용이므로 `accessibleOnly=false`로 호출해 전체 프로젝트 조회

#### (b) `ProjectContext` — 사용자 시각의 프로젝트 목록

- 기존 `/api/projects` 호출 그대로 사용. 위 (a)에서 서버 측 필터링되므로 클라이언트 변경 없음.

#### (c) 프로젝트 종속 API에 멤버십 가드

새 헬퍼:

```ts
// src/lib/auth.ts에 추가
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
    return NextResponse.json({ error: "프로젝트에 접근할 권한이 없습니다." }, { status: 403 });
  }
  return null;
}
```

**적용 대상 (이번 PR):**
1. `/api/projects/[id]` GET/PATCH/DELETE
2. `/api/progress-tasks` POST (body.projectId), GET (?projectId), import/export
3. `/api/progress-tasks/[id]` 모든 메서드 — task로부터 projectId 조회 후 체크
4. `/api/members` POST (body.projectId), GET (?projectId)
5. `/api/members/[id]` 모든 메서드 — member로부터 projectId 조회 후 체크

**범위에서 제외 (별도 작업):**
- `/api/tasks` (칸반), `/api/wbs`, `/api/requirements`, `/api/issues` 등 — 동일 패턴을 반복 적용해야 하지만 본 PR의 부피를 키우므로 후속 작업
- 이번 PR은 **/dashboard/users 페이지 + 진도 리스크 관련 API + 프로젝트 자체 API**만 가드

이 범위 분리의 이유: 모든 프로젝트 종속 API에 한 번에 적용하면 변경 폭이 너무 크고 회귀 위험이 커진다. 가장 자주 쓰는 동선(진도 리스크 페이지)부터 적용하고, 나머지는 패턴이 확정된 뒤 후속 PR로 일괄 적용한다.

#### (d) 신규 사용자 안내

- 멤버십 0개인 일반 USER가 ProjectContext에서 빈 목록을 받는 경우 → 대시보드 진입 시 "참여 중인 프로젝트가 없습니다. 관리자에게 문의해주세요." 안내

## 5. 대시보드 정리

### 5-1. 제거
`src/app/dashboard/page.tsx`:
- "새 프로젝트" 버튼 (709-712행)
- 생성 모달 (932-) 및 관련 상태 (`setShowCreateModal`, 폼 상태)
- 빈 상태에서의 생성 버튼 (788-)

### 5-2. 유지
- `/dashboard/projects` 페이지의 생성 기능 — 그대로 둠
- 메인 대시보드의 "프로젝트가 없습니다" 빈 상태는 안내만 표시하고 생성 버튼 대신 사용자/프로젝트 관리 페이지로의 링크 안내

### 5-3. 사이드바
- "유저 관리" 메뉴명 → "사용자/프로젝트 관리"
- ADMIN 사용자에게만 노출 (이미 ADMIN 권한 기반 메뉴 분기가 있다면 거기에 추가)

## 6. API 변경

### 6-1. 기존 API 시그니처 변경 없음
- `/api/projects` GET: `?accessibleOnly=true|false` 옵션 추가 (기본 true). 응답 형태 동일.
- `/api/members` GET: 변경 없음. 단, `?projectId`에 대해 멤버십 가드 적용.
- `/api/members` POST: 변경 없음. body.projectId에 대해 멤버십 가드 적용.

### 6-2. 추가 API
없음. 기존 엔드포인트로 충분.

## 7. 컴포넌트 구조 (CLAUDE.md 가이드 준수)

```
src/app/dashboard/users/
├── page.tsx                           # 컴포넌트 조합만 (~150줄)
├── components/
│   ├── index.ts
│   ├── UserListPanel.tsx              # 좌측 패널 (~200줄)
│   ├── UserListRow.tsx                # 좌측 행 (~80줄)
│   ├── UserFormModal.tsx              # 기존 추가/수정 모달 추출 (~250줄)
│   ├── ProjectListPanel.tsx           # 우측 상단 패널 (~150줄)
│   ├── ProjectListRow.tsx             # 우측 프로젝트 행 (~60줄)
│   ├── ProjectFormModal.tsx           # 프로젝트 생성/수정 모달 (~150줄)
│   ├── MemberSection.tsx              # 우측 하단 멤버 섹션 (~180줄)
│   └── MemberRow.tsx                  # 멤버 행 + 역할 인라인 편집 (~100줄)
└── hooks/
    └── useBulkInviteMembers.ts        # 일괄 초대 (~50줄)
```

기존 `users/page.tsx` (862줄)는 너무 커진 상태이므로, 이번 작업에서 컴포넌트 분할까지 함께 진행한다.

## 8. 컴포넌트별 책임

| 컴포넌트 | 책임 | 의존성 |
|---|---|---|
| `page.tsx` | 좌/우 패널 배치, selectedProjectId 상태 보유, 모달 트리거 | `useUsers`, `useProjects`, 자식 컴포넌트들 |
| `UserListPanel` | 사용자 검색/필터, 다중선택 체크박스, 일괄추가 버튼 | `useUsers`, props로 selectedProjectId 받음 |
| `ProjectListPanel` | 프로젝트 검색, 행 클릭으로 선택 변경 | `useProjects(accessibleOnly: false)` |
| `MemberSection` | 선택된 프로젝트의 멤버 목록, 역할 인라인 편집, 멤버 제거 | `useMembers({projectId})`, `useUpdateMember`, `useRemoveMember` |
| `useBulkInviteMembers` | userIds[] + projectId 받아 순차 호출. 실패/중복 집계 후 토스트 | `useInviteMember` 또는 직접 `api.members.create` |

## 9. 에러 처리

| 시나리오 | 동작 |
|---|---|
| 일괄 추가 중 일부 사용자가 이미 멤버 | 스킵하고 추가된 N명만 성공, 토스트로 "N명 추가, M명은 이미 멤버" 안내 |
| 일괄 추가 중 네트워크 오류 | 실패한 사용자만 토스트로 표시하고 성공한 건은 유지 |
| 권한 없는 사용자가 페이지 URL 직접 접근 | 페이지 컴포넌트 진입 즉시 user.role 체크 → "관리자 전용" 화면 |
| 권한 없는 사용자가 가드된 API 호출 | 403 응답 → React Query 에러 → 토스트 |
| OWNER 본인 제거 시도 | 멤버 행의 [×] 버튼은 본인이 OWNER인 경우 비활성화 (실수 방지) |
| OWNER가 한 명도 없는 상태 발생 가능성 | 본 PR에서는 검증 안함. ADMIN이 의도적으로 그렇게 만들 수 있고, ADMIN은 어차피 모든 프로젝트 접근 가능하므로 차단할 실익 없음. |

## 10. 테스트 전략

### 단위 테스트 (vitest)
- `assertProjectAccess` 헬퍼: ADMIN allow, 멤버 allow, 비멤버 403
- `useBulkInviteMembers` 훅: 성공/중복/실패 집계
- 멤버 행의 역할 변경 PATCH 호출 검증

### 통합 테스트 (수동)
1. ADMIN 로그인 → `/dashboard/users` 진입, 사용자/프로젝트 관리 동작 확인
2. 일반 USER 로그인 → 메뉴 안 보임, URL 직접 접근 시 차단 확인
3. 일반 USER 로그인 → 프로젝트 셀렉터에 자기 프로젝트만 보임
4. 일반 USER 로그인 → URL로 비멤버 프로젝트 데이터(`/api/progress-tasks?projectId=...`) 직접 호출 시 403
5. 프로젝트 생성 시 생성자가 자동 OWNER 멤버로 추가되는지 확인 (기존 동작 유지)

## 11. 구현 순서 (다음 plan에서 상세화)

1. `assertProjectAccess` 헬퍼 + `/api/projects` GET 인증/필터링
2. 진도 리스크 및 멤버 API에 가드 적용
3. `/dashboard/users` 컴포넌트 분할 (기존 동작 유지)
4. 우측 프로젝트 패널 + 멤버 섹션 구현
5. 일괄 추가 인터랙션
6. 대시보드 메인의 프로젝트 생성 제거
7. 사이드바 메뉴명 변경 + ADMIN 가드
8. 진도 페이지 등에서 정상 동작 회귀 확인

## 12. 영향 및 위험

- **회귀 위험**: 인증/권한 가드가 새로 들어가는 API에서, 기존에 사용 중이던 클라이언트가 권한 체크에 걸려 데이터를 못 받을 수 있다. 대응:
  - 현재 시스템 운영자(개발자 본인 + 주 사용자)는 모두 ADMIN 권한이므로 영향 없음
  - 일반 USER 계정으로 사용 중이던 사용자가 있다면, ADMIN이 사용자/프로젝트 관리 페이지에서 명시적으로 멤버 등록 필요
  - 마이그레이션 스크립트는 만들지 않음. 운영 인원이 적고 ADMIN 위주이므로 수동 보정으로 충분.
- **운영 변경**: 새 사용자가 가입해도 어떤 프로젝트에도 접근 못함. ADMIN이 명시적으로 멤버 등록해야 함. — 의도된 동작.
- **OWNER 일관성**: 프로젝트 생성 시 OWNER 자동 등록은 기존 코드에 이미 있음. 본 작업에서 중복 구현하지 않음.
