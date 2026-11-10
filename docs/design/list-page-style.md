# 리스트 페이지 스타일 규칙

> 출처: 원래 AGENTS.md 에 있던 규칙을 2026-10-25 이 문서로 옮겼다. 참고 페이지 경로는 `src/app/dashboard/` 기준.

유사한 리스트 형태의 페이지 생성 시 아래 규칙을 따릅니다.
**참고 페이지**: `issues/page.tsx`, `customer-requirements/page.tsx`

## 페이지 레이아웃 구조

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

## 1. 헤더 스타일

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

## 2. 통계 카드 (6열 그리드)

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

## 3. 탭 스타일

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

## 4. 필터 바

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

## 5. 테이블 (Grid 레이아웃)

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

## 6. 상태 배지 드롭다운

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

## 7. 상태 설정 타입 (types.ts)

```typescript
/** 상태 설정 (아이콘, 색상 포함) */
export const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  PENDING: { label: "대기", icon: "pending", color: "text-warning", bgColor: "bg-warning/10" },
  ACTIVE: { label: "활성", icon: "check_circle", color: "text-success", bgColor: "bg-success/10" },
  COMPLETED: { label: "완료", icon: "done_all", color: "text-primary", bgColor: "bg-primary/10" },
  CANCELLED: { label: "취소", icon: "cancel", color: "text-error", bgColor: "bg-error/10" },
};
```

## 7-1. 배지 색 (라이트 · 다크 공용)

- 배지 · 칩 배경은 반투명 토큰을 쓴다: `bg-{색}-500/10` (또는 `bg-primary/10` 같은 시맨틱 토큰).
- 글자색은 라이트 · 다크를 함께 적는다: `text-{색}-600 dark:text-{색}-400`.
- 섹션 머리처럼 면이 넓은 곳의 테두리: `border-{색}-500/30`.
- `bg-{색}-50` · `bg-white` 같은 밝은 단색 배경을 다크 짝 없이 쓰지 않는다 (다크 테마에서 흰 칩으로 튄다).
- 색 정의는 화면별 `constants.ts`(또는 `types.ts`)의 설정 객체 한 곳에 둔다. 예: `src/app/dashboard/as-is-analysis/constants.ts`.

## 7-2. 그리드 표의 늘어나는 칼럼

- `1fr` 칼럼은 `minmax(최소폭, 1fr)` 로 최소 폭을 주고, 표 컨테이너에 `overflow-x-auto`, 헤더 · 행에 `min-w-[...]` 를 준다.
  `1fr` 만 쓰면 옆 패널이 열린 좁은 화면에서 0 에 가깝게 줄어 글자가 세로로 쌓인다.

## 8. 공통 컴포넌트 사용

- **ImportExcelModal**: `@/components/common`에서 import
- **Icon, Button, Input**: `@/components/ui`에서 import
- **useProject**: `@/contexts`에서 프로젝트 컨텍스트

## 9. 필수 기능

1. ✅ 로딩 상태 (스피너)
2. ✅ 에러 상태 (에러 메시지)
3. ✅ 프로젝트 미선택 안내
4. ✅ 빈 목록 안내
5. ✅ 엑셀 다운로드
6. ✅ 엑셀 가져오기 (공통 모달)
7. ✅ 상태 클릭 드롭다운 변경
8. ✅ 수정/삭제 버튼
