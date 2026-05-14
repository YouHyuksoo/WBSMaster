# 카테고리별 가변 단계 시스템 — 디자인 문서

작성일: 2026-05-14
범위: 진도 task의 단계를 카테고리별·프로젝트별 가변 구조로 전환

## 1. 배경 및 목표

### 현재 상태
- `ProgressStage` enum: 10단계 고정 (ANALYSIS ~ STABILIZATION + OPEN)
- 모든 task가 동일한 단계 흐름 적용
- 진척률 = `(stageIndex + 1) / STAGE_ORDER.length * 100`
- 단계 추가/변경 시 코드 + DB 마이그레이션 + 배포 필요

### 목표
1. task에 **카테고리** 컬럼 도입 (MES시스템/설비연동/단말기/기준정보/ERP I/F/SLMS I/F/CUT OFF/운영/인프라/기타 — 10종)
2. 단계는 **프로젝트별 + 카테고리별**로 다르게 정의 가능
3. 단계 추가/이름변경/순서변경/삭제/합치기를 UI에서 직접 수행
4. 기존 데이터는 "기타" 카테고리로 매끄럽게 마이그레이션

### 비목표
- 카테고리 자체의 CRUD (10개 고정 enum)
- 단계별 가중치 / 단계별 task 검증 규칙 등 고급 기능 — 후속 작업

## 2. 데이터 모델

### 2-1. 새 enum: `StageCategory`

```prisma
enum StageCategory {
  MES_SYSTEM   // MES시스템
  EQUIPMENT    // 설비연동
  TERMINAL     // 단말기
  MASTER_DATA  // 기준정보
  ERP_IF       // ERP I/F
  SLMS_IF      // SLMS I/F
  CUT_OFF      // CUT OFF
  OPERATION    // 운영
  INFRA        // 인프라
  ETC          // 기타 (마이그레이션 기본값)
}
```

한글 라벨은 `src/lib/progress-stages.ts`에 매핑 상수로 정의.

### 2-2. 새 테이블: `ProgressStageDef`

```prisma
model ProgressStageDef {
  id        String        @id @default(uuid())
  projectId String
  category  StageCategory
  name      String        // "분석", "설계" 등
  order     Int           // 0부터 시작, 카테고리 내에서 고유

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   ProgressTask[] @relation("CurrentStageDef")

  @@unique([projectId, category, name])
  @@unique([projectId, category, order])
  @@index([projectId, category])
  @@map("progress_stage_defs")
}
```

- `projectId + category + name` 유니크 — 같은 카테고리 내 단계명 중복 금지
- `projectId + category + order` 유니크 — 순서 충돌 방지
- `Project.onDelete: Cascade` — 프로젝트 삭제 시 함께 정리
- `ProgressTask.currentStageId`는 `onDelete: SetNull` — 단계 삭제 시 task의 진도만 초기화

### 2-3. `ProgressTask` 변경

```prisma
model ProgressTask {
  ...
  // 변경 전:
  //   currentStage ProgressStage @default(ANALYSIS)
  // 변경 후:
  stageCategory   StageCategory     @default(ETC)
  currentStageId  String?
  currentStageDef ProgressStageDef? @relation("CurrentStageDef", fields: [currentStageId], references: [id], onDelete: SetNull)
  ...
}
```

`category` 필드(대분류 자유 텍스트)는 기존 그대로 유지.

### 2-4. `ProgressStage` enum 처리

- 마이그레이션 완료 후 `currentStage` 컬럼을 drop하고 `ProgressStage` enum도 폐기
- 다만 점진적 마이그레이션을 위해 한 PR 내에서 단일 마이그레이션으로 처리

## 3. 마이그레이션 전략

### 3-1. 순서

1. **schema.prisma 변경 push**: `StageCategory` enum, `ProgressStageDef` 테이블, `ProgressTask.stageCategory` + `currentStageId` 컬럼 추가. 기존 `currentStage`는 유지.
2. **데이터 마이그레이션 스크립트** `scripts/migrate-stage-defs.ts`:
   - 모든 기존 프로젝트에 대해 ETC 카테고리에 10개 기본 단계를 시드:
     `분석, 설계, 구현, 단위테스트, IT 테스트, 교육, 통합테스트, 오픈, 이행, 안정화` (order: 0~9)
   - 모든 기존 `ProgressTask`에 대해:
     - `stageCategory = "ETC"` 설정
     - `currentStageId = <매핑된 ProgressStageDef.id>` 설정
     - enum → 이름 매핑: `ANALYSIS→분석`, `DESIGN→설계`, ..., `STABILIZATION→안정화`
3. **schema.prisma 두 번째 push**: `currentStage` 컬럼 drop + `ProgressStage` enum 제거

본 PR에서는 두 단계를 한 번에 처리하되, 사용자가 db push 사이에 마이그레이션 스크립트를 실행한다.

### 3-2. 기본 단계 시드 함수

`src/lib/progress-stages.ts`에 `DEFAULT_ETC_STAGES` 상수와 시드 헬퍼:

```typescript
export const DEFAULT_ETC_STAGES: readonly string[] = [
  "분석", "설계", "구현", "단위테스트", "IT 테스트",
  "교육", "통합테스트", "오픈", "이행", "안정화",
];
```

신규 프로젝트 생성 시(`POST /api/projects`)에도 자동으로 ETC 카테고리에 이 단계 세트를 시드.

## 4. API

모든 라우트에 `requireAuth()` + `assertProjectAccess(projectId, user)` 가드 적용.

### 4-1. 단계 조회

```
GET /api/projects/[id]/stage-defs?category=MES_SYSTEM
→ ProgressStageDef[] (해당 카테고리의 단계, order asc)
```

`category` 쿼리 생략 시 모든 카테고리의 단계 반환 (계층 형식 또는 flat 배열).

### 4-2. 단계 추가

```
POST /api/projects/[id]/stage-defs
body: { category: StageCategory, name: string, order?: number }
```

- `order` 생략 시 그 카테고리의 마지막 + 1
- `order` 지정 시 그 위치에 삽입 (기존 같은 order 이상의 항목은 +1 shift)

### 4-3. 단계 수정

```
PATCH /api/stage-defs/[id]
body: { name?: string, order?: number }
```

`order` 변경 시 순서 재정렬(swap 또는 shift).

### 4-4. 단계 삭제

```
DELETE /api/stage-defs/[id]
```

`onDelete: SetNull`로 해당 단계를 쓰던 task들의 `currentStageId`가 null이 됨. 진척률 0% 표시.

### 4-5. 단계 합치기

```
POST /api/stage-defs/[id]/merge-into
body: { targetStageId: string }
```

트랜잭션 동작:
1. source(`id`)와 target(`targetStageId`)이 같은 projectId + category 검증 (다르면 400)
2. `ProgressTask.currentStageId`가 source인 모든 task를 target으로 update
3. source 삭제
4. 남은 단계들의 order 재정렬 (gap 메우기)

### 4-6. 인가 정책

- 단계 추가/수정/삭제/합치기: ADMIN 또는 그 프로젝트의 OWNER/MANAGER만 (`/api/members` POST 패턴과 동일)
- 단계 조회: 단순 멤버이면 통과 (`assertProjectAccess`만)

## 5. UI

### 5-1. 그리드 컬럼 변경

순서: `# / 코드 / 사업부 / 카테고리 / 대분류 / 기능명 / 시작 / 종료 / 단계 / 선행 / 담당자 / 상태 / X`

- **카테고리** (새): 10종 enum select 드롭다운. 변경 시 PATCH로 즉시 저장. currentStageId가 새 카테고리에 없으면 null로 재설정.
- 그리드 폭: 카테고리 컬럼 100px 추가 → `min-w-[1800px]`

### 5-2. 헤더의 `[단계 관리]` 버튼

`PageHeader.tsx` 우측 액션 영역에 추가. 클릭 시 `StageManagerModal` 오픈. ADMIN 또는 프로젝트 OWNER/MANAGER만 활성 (그 외 사용자는 비활성 + 툴팁 "권한 없음").

### 5-3. `StageManagerModal`

```
┌────────────────────────────────────────────────────────────┐
│ 단계 관리 — 프로젝트 A                              [×]   │
├──────────────┬─────────────────────────────────────────────┤
│ 카테고리      │ MES시스템 단계 (3)              [+ 추가]    │
│              │                                            │
│ ▶ MES시스템  │ ⋮⋮ 분석          [이름 편집]   [합치기→]   │
│   설비연동   │ ⋮⋮ 설계          [이름 편집]   [합치기→]   │
│   단말기     │ ⋮⋮ 구현          [이름 편집]   [합치기→]   │
│   기준정보   │                                            │
│   ERP I/F    │ ── 합치기 패널 (선택 시 노출) ─────────────  │
│   SLMS I/F   │ source: 분석  →  target: [설계 ▼]  [실행]   │
│   CUT OFF    │ ⚠ '분석' 단계의 task N개가 '설계'로 이동.   │
│   운영       │                                            │
│   인프라     │                                            │
│   기타       │                                            │
└──────────────┴─────────────────────────────────────────────┘
```

- 좌측: 10개 카테고리 탭 (각 옆에 단계 개수 표시)
- 우측: 선택된 카테고리의 단계 리스트
  - 드래그 핸들 `⋮⋮`로 순서 변경 (PATCH order)
  - 인라인 이름 편집 (debounce PATCH)
  - `[합치기→]`: 클릭 시 합치기 패널 노출, target select 후 실행
  - `[+ 추가]`: 단계명 입력 + 추가
  - `[×]`: 삭제 확인 모달 ("이 단계를 사용 중인 task N개의 진도가 초기화됩니다.")

### 5-4. `StageStepper` 동적 단계

기존 `StageStepper`는 정적 STAGE_ORDER 기반. 새 컴포넌트는:
- props 변경: `stages: ProgressStageDef[]`, `currentStageId: string | null`, `onChange: (stageId: string | null) => void`
- `stages.length === 0`이면 "단계가 정의되지 않았습니다" 안내 + `[단계 관리]` 링크 버튼
- 동작은 기존과 동일 (현재 단계 청록 발광, 완료 초록, 미진행 회색)

### 5-5. 진도 계산

```typescript
function stageProgressPct(task: ProgressTask, stagesOfCategory: ProgressStageDef[]): number {
  if (stagesOfCategory.length === 0) return 0;
  if (!task.currentStageId) return 0;
  const idx = stagesOfCategory.findIndex(s => s.id === task.currentStageId);
  if (idx < 0) return 0; // 데이터 불일치 안전망
  return Math.round(((idx + 1) / stagesOfCategory.length) * 100);
}
```

서버의 `PATCH /api/progress-tasks/[id]`에서 currentStageId 변경 시 위 공식으로 `progress` 컬럼 재계산.

### 5-6. Forecast 계산 (`src/lib/progress-calc/`)

기존 forecast는 `currentStage` enum의 글로벌 진척률을 사용. 변경:
- `computeForecast` 입력에 `stagesByCategory: Map<StageCategory, ProgressStageDef[]>` 추가
- 각 task의 진척률을 `(task.stageCategory, task.currentStageId)`로 조회 후 계산
- `forecast.test.ts` 갱신

## 6. Excel I/O

### 6-1. Export (`/api/progress-tasks/export`)

새 컬럼 추가:
- "카테고리" — `STAGE_CATEGORY_LABEL[task.stageCategory]` (한글 라벨)
- "현재 단계" — `task.currentStageDef?.name ?? ""`

### 6-2. Import (`/api/progress-tasks/import`)

- "카테고리" 한글 → enum 매핑 (`STAGE_CATEGORY_REVERSE`). 미지정 시 ETC
- "현재 단계" 이름 → 해당 카테고리 stageDef id 매핑
  - 해당 이름의 stageDef가 없으면 그 카테고리에 단계를 시드 후 매핑 (또는 첫 단계로 폴백 — 결정 필요)
  - **결정**: 폴백 정책은 "현재 단계 이름이 매칭 안 되면 currentStageId=null로 임포트 + 경고 로그". 사용자가 단계 관리에서 단계를 만든 뒤 다시 설정하도록.

## 7. 컴포넌트 / 파일 구조

### 7-1. 신규

```
src/lib/progress-stages.ts                          # STAGE_CATEGORY_LABEL, DEFAULT_ETC_STAGES, stageProgressPct
src/app/api/projects/[id]/stage-defs/route.ts       # GET / POST
src/app/api/stage-defs/[id]/route.ts                # PATCH / DELETE
src/app/api/stage-defs/[id]/merge-into/route.ts     # POST
src/hooks/useStageDefs.ts                            # useStageDefs, useCreateStageDef, useUpdateStageDef, useDeleteStageDef, useMergeStageDef
src/app/dashboard/progress-risk/components/StageManagerModal/
  ├── index.tsx                  # 메인 모달
  ├── CategoryTabs.tsx           # 좌측 카테고리 탭
  ├── StageList.tsx              # 우측 단계 리스트
  ├── StageListRow.tsx           # 단계 1행 (이름 편집 + 합치기 + 삭제)
  └── MergePanel.tsx             # 합치기 패널
scripts/migrate-stage-defs.ts                       # 데이터 마이그레이션 스크립트
```

### 7-2. 수정

```
prisma/schema.prisma                                # StageCategory enum, ProgressStageDef, ProgressTask 변경
src/lib/progress-stages.ts                          # STAGE_ORDER/STAGE_LABEL/STAGE_SHORT 폐기, 새 함수 도입
src/lib/progress-calc/forecast.ts                   # 동적 단계 진척률 적용
src/lib/progress-calc/__tests__/forecast.test.ts    # 갱신
src/app/dashboard/progress-risk/types.ts            # ProgressStage 타입 제거, StageCategory 추가
src/app/dashboard/progress-risk/constants.ts        # STAGE_LABEL/STAGE_SHORT 제거
src/app/dashboard/progress-risk/components/StageStepper.tsx           # props 변경
src/app/dashboard/progress-risk/components/TaskGrid.tsx               # 카테고리 컬럼 추가
src/app/dashboard/progress-risk/components/TaskRow.tsx                # 카테고리 select + StageStepper props 변경
src/app/dashboard/progress-risk/components/GanttTab/GanttRow.tsx      # mini-stepper 동적
src/app/dashboard/progress-risk/components/PageHeader.tsx             # [단계 관리] 버튼 추가
src/app/api/progress-tasks/route.ts                                   # POST에 stageCategory 처리, progress 계산 변경
src/app/api/progress-tasks/[id]/route.ts                              # PATCH에 currentStageId/stageCategory 처리, progress 변경
src/app/api/progress-tasks/export/route.ts                            # 카테고리/현재 단계 출력 변경
src/app/api/progress-tasks/import/route.ts                            # 카테고리/현재 단계 입력 변경
src/app/api/projects/route.ts                                         # 프로젝트 생성 시 ETC 카테고리 시드
src/app/dashboard/progress-risk/__tests__/constants.test.ts           # 기존 STAGE_ORDER 테스트 제거, 새 함수 테스트 추가
```

## 8. 에러 처리

| 시나리오 | 처리 |
|---|---|
| 단계 삭제 시 그 단계를 쓰는 task가 있음 | 삭제는 허용. task의 currentStageId가 SetNull되어 진척률 0%. 삭제 확인 모달에 "task N개의 진도가 초기화됩니다" 안내 |
| 합치기 시 source/target이 같은 카테고리 아님 | 400 응답 + 토스트 "같은 카테고리 내에서만 합칠 수 있습니다" |
| 단계명 중복 추가 | 400 응답 + 토스트 "이미 존재하는 단계명" |
| 카테고리 변경 시 currentStageId가 새 카테고리에 없음 | 자동으로 null로 설정. 토스트 안내 "단계가 초기화됨" |
| 데이터 불일치 (currentStageId가 그 카테고리에 속하지 않음) | UI에서 0% 표시, 단계 stepper에 경고 아이콘 |

## 9. 테스트

### 9-1. 단위 테스트
- `assertProjectAccess` 이미 존재 (Task 1)
- `stageProgressPct` 함수: 단계 수 / currentStageId 위치별 케이스
- 합치기 트랜잭션: source의 task가 target으로 이동 + source 삭제 검증 (DB 모킹 또는 in-memory)
- forecast.test.ts: 새 진척률 산식 반영

### 9-2. 통합 테스트 (수동)
1. 새 프로젝트 생성 → ETC 카테고리에 10단계 자동 시드 확인
2. 단계 관리 모달에서 단계 추가/이름변경/삭제/순서변경/합치기 모두 동작
3. task 카테고리 변경 시 단계 stepper가 새 카테고리 단계로 갱신
4. 진척률이 새 단계 수에 맞게 재계산
5. 일반 USER가 단계 변경 시도 → 403
6. Excel export/import 카테고리·단계 매핑 정상

## 10. 구현 순서 (다음 plan에서 상세화)

1. Prisma schema 변경 1차: StageCategory enum + ProgressStageDef 테이블 + ProgressTask 새 필드 추가
2. `progress-stages.ts` 새 상수와 함수
3. 데이터 마이그레이션 스크립트 작성 + 실행
4. Prisma schema 변경 2차: ProgressStage enum과 currentStage 컬럼 drop
5. stage-defs API 5개 라우트
6. useStageDefs 훅 묶음
7. PATCH /api/progress-tasks 의 currentStageId/stageCategory 처리 및 progress 산식 변경
8. forecast.ts 갱신 + 테스트 통과
9. StageManagerModal 컴포넌트 (CategoryTabs, StageList, StageListRow, MergePanel)
10. PageHeader에 [단계 관리] 버튼
11. StageStepper 동적 props
12. TaskGrid/TaskRow: 카테고리 컬럼 추가
13. GanttRow mini-stepper 동적
14. Excel import/export 갱신
15. 회귀 점검 + 정리

## 11. 영향 및 위험

- **데이터 마이그레이션 실패 시 진도 데이터 손실**: 백업 → schema 1차 push → 마이그레이션 스크립트(dry-run 옵션) → 검증 → schema 2차 push 순서. 실패하면 schema 2차는 안 함.
- **`ProgressStage` enum을 직접 참조하는 외부 코드**: 본 PR에서 모두 새 모델로 교체. 누락 방지를 위해 enum drop 후 빌드해서 컴파일 에러로 잡아냄.
- **forecast 진척률 변경으로 기존 보고서 수치가 달라질 수 있음**: 기존 task의 enum → 단계 매핑이 1:1이라 같은 진척률 유지 (분석=1/10=10%, 설계=2/10=20%, ...). 사용자가 단계를 추가/삭제하면 그때부터 달라짐. 의도된 동작.
- **StageManagerModal의 합치기 작업이 트랜잭션 실패 시**: Prisma 트랜잭션으로 묶어 atomic 보장. 실패하면 변경 없음.

## 12. 후속 작업 (이번 PR 범위 외)

- 단계별 가중치 도입 (현재 평균 진척률 외 가중 평균)
- 카테고리 enum 자체의 CRUD (현재 10개 고정)
- 단계 템플릿(다른 프로젝트의 단계 세트 복사)
