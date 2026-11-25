/**
 * @file src/lib/wbs/move-plan.ts
 * @description
 * WBS 항목 이동 · 추가 때 번호(code) · 순서(order) · 레벨을 계산하는 순수 함수입니다. 서버(이동 · 생성 API)와 화면(이동 창 미리보기)이 같이 씁니다.
 *
 * 초보자 가이드:
 * 1. **planWbsMove**: 항목을 고른 상위 항목 아래, 고른 자리에 넣었을 때 바뀌는 행 목록을 돌려준다 (안 되는 이동이면 이유)
 * 2. **checkWbsMove**: 그 상위 항목으로 옮길 수 있는지만 검사한다 (못 가면 이유, 되면 null)
 * 3. **nextChildSlot**: 맨 뒤에 새로 넣을 때의 번호 · 순서. 번호는 개수가 아니라 "가장 큰 번호 + 1" 이다
 *    → 회귀: 개수로 세면 중간 번호(1.6)를 지운 묶음에서 이미 있는 번호(1.12)가 다시 나와 저장이 실패했다
 * 4. 번호는 되도록 그대로 둔다. 다른 묶음에서 빠져나간 자리는 비워 두고, 끼워 넣은 자리 뒤에서 겹치는 번호만 민다.
 *    같은 묶음 안 순서 바꾸기는 그 묶음이 쓰던 번호들을 새 순서대로 다시 나눠 준다
 * 5. 옮기는 항목의 하위는 모두 따라가며 레벨도 새 깊이에 맞춘다. 4레벨을 넘으면 옮기지 않고 이유를 돌려준다
 */

export type MoveLevel = "LEVEL1" | "LEVEL2" | "LEVEL3" | "LEVEL4";

export interface MoveNode {
  id: string;
  code: string;
  level: MoveLevel;
  order: number;
  parentId?: string | null;
}

/** 옮길 자리. afterId: 이 형제 다음 · null 이면 맨 앞 · 없으면(undefined) 맨 뒤 */
export interface MoveTarget {
  parentId: string | null;
  afterId?: string | null;
}

export interface MoveChange {
  id: string;
  code: string;
  level: MoveLevel;
  order: number;
  parentId: string | null;
}

export type MovePlan =
  | { ok: false; error: string }
  | {
      ok: true;
      /** 옮긴 뒤 이 항목의 값 */
      item: MoveChange;
      /** 저장해야 하는 행 (바뀌지 않으면 빈 배열) */
      changes: MoveChange[];
      /** 함께 옮겨지는 하위 항목 수 */
      descendantCount: number;
      /** 자리를 내주느라 번호가 바뀌는 다른 형제 */
      renumbered: Array<{ id: string; from: string; to: string }>;
      /** 번호가 바뀌는 다른 항목 수 (형제의 하위 포함, 옮기는 항목과 그 하위 제외) */
      renumberedTotal: number;
    };

const MAX_LEVEL = 4;
/** 자기 자신 · 자기 하위로 옮기려 할 때의 이유 (목록은 이 값으로 구분해 짧게 적는다) */
export const MOVE_INTO_SELF = "자기 자신이나 자기 하위 항목 아래로는 옮길 수 없습니다.";
const levelNo = (level: MoveLevel) => Number(level.slice(5));
const toLevel = (n: number) => `LEVEL${n}` as MoveLevel;
const joinCode = (parentCode: string | null, tail: number) => (parentCode ? `${parentCode}.${tail}` : String(tail));
const bySiblingOrder = (a: MoveNode, b: MoveNode) => a.order - b.order || a.code.localeCompare(b.code, undefined, { numeric: true });

/** 부모 번호를 뺀 마지막 번호 (부모 번호로 시작하지 않거나 숫자가 아니면 0) */
function tailOf(code: string, parentCode: string | null): number {
  const rest = parentCode ? (code.startsWith(`${parentCode}.`) ? code.slice(parentCode.length + 1) : "") : code;
  return /^\d+$/.test(rest) ? Number(rest) : 0;
}

function index(nodes: MoveNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byParent = new Map<string | null, MoveNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = byParent.get(key);
    if (list) list.push(n);
    else byParent.set(key, [n]);
  }
  byParent.forEach((list) => list.sort(bySiblingOrder));
  return { byId, childrenOf: (id: string | null) => byParent.get(id) ?? [] };
}

type Index = ReturnType<typeof index>;

/** 자기 자신을 포함한 단계 수 (하위가 없으면 1) */
function height(ix: Index, id: string): number {
  return 1 + Math.max(0, ...ix.childrenOf(id).map((c) => height(ix, c.id)));
}

function blockedReason(ix: Index, id: string, parentId: string | null): string | null {
  if (!ix.byId.has(id)) return "옮길 항목을 찾을 수 없습니다.";
  let parentLevel = 0;
  if (parentId !== null) {
    const parent = ix.byId.get(parentId);
    if (!parent) return "옮길 위치의 상위 항목을 찾을 수 없습니다.";
    for (let p: MoveNode | undefined = parent; p; p = p.parentId ? ix.byId.get(p.parentId) : undefined) {
      if (p.id === id) return MOVE_INTO_SELF;
    }
    parentLevel = levelNo(parent.level);
  }
  if (parentLevel >= MAX_LEVEL) return "단위업무(4레벨) 아래에는 넣을 수 없습니다.";
  const below = height(ix, id) - 1;
  if (parentLevel + 1 + below > MAX_LEVEL) return `하위가 ${below}단계 있어 여기로 옮기면 단위업무(4레벨)를 넘습니다.`;
  return null;
}

/** 이 상위 항목 아래로 옮길 수 없는 이유 (옮길 수 있으면 null) */
export function checkWbsMove(nodes: MoveNode[], id: string, parentId: string | null): string | null {
  return blockedReason(index(nodes), id, parentId);
}

/** 맨 뒤에 새로 넣을 자리의 번호 · 순서 */
export function nextChildSlot(siblings: Array<Pick<MoveNode, "code" | "order">>, parentCode: string | null) {
  const tail = Math.max(0, ...siblings.map((s) => tailOf(s.code, parentCode))) + 1;
  return { code: joinCode(parentCode, tail), order: Math.max(-1, ...siblings.map((s) => s.order)) + 1 };
}

/** 새 순서대로 놓인 묶음의 마지막 번호들 */
function assignTails(list: MoveNode[], at: number, parentCode: string | null, sameParent: boolean): number[] {
  const own = list.map((n, i) => (i === at && !sameParent ? 0 : tailOf(n.code, parentCode)));
  if (sameParent && own.every((t) => t > 0) && new Set(own).size === own.length) return [...own].sort((a, b) => a - b);
  let prev = Math.max(0, ...own.slice(0, at));
  return own.map((t, i) => {
    if (i < at) return t;
    prev = i === at ? prev + 1 : Math.max(t, prev + 1);
    return prev;
  });
}

/** 이동 계획: 고른 자리에 넣었을 때 바뀌는 행 */
export function planWbsMove(nodes: MoveNode[], id: string, target: MoveTarget): MovePlan {
  const ix = index(nodes);
  const error = blockedReason(ix, id, target.parentId);
  if (error) return { ok: false, error };

  const item = ix.byId.get(id)!;
  const parent = target.parentId ? ix.byId.get(target.parentId)! : null;
  const sameParent = (item.parentId ?? null) === target.parentId;
  const siblings = ix.childrenOf(target.parentId).filter((n) => n.id !== id);
  let at = siblings.length;
  if (target.afterId === null) at = 0;
  else if (target.afterId !== undefined) {
    at = siblings.findIndex((n) => n.id === target.afterId) + 1;
    if (at === 0) return { ok: false, error: "고른 자리의 기준 항목이 그 상위 항목 아래에 없습니다. 새로고침 후 다시 고르세요." };
  }
  const list = [...siblings.slice(0, at), item, ...siblings.slice(at)];
  const parentCode = parent?.code ?? null;
  const tails = assignTails(list, at, parentCode, sameParent);

  const changes: MoveChange[] = [];
  const renumbered: Array<{ id: string; from: string; to: string }> = [];
  let moved: MoveChange | null = null;
  let descendantCount = 0;
  let renumberedTotal = 0;

  const push = (n: MoveNode, next: Omit<MoveChange, "id">) => {
    const change = { id: n.id, ...next };
    if (n.code !== next.code || n.level !== next.level || n.order !== next.order || (n.parentId ?? null) !== next.parentId) changes.push(change);
    return change;
  };
  /** 하위 번호는 부모 번호만 바꿔 끼우고, level 을 주면(옮기는 항목) 레벨도 깊이에 맞춘다 */
  const descend = (n: MoveNode, newCode: string, level: number | null) => {
    let prev = 0;
    for (const c of ix.childrenOf(n.id)) {
      const tail = tailOf(c.code, n.code);
      prev = tail > prev ? tail : prev + 1;
      const code = joinCode(newCode, prev);
      push(c, { code, order: c.order, parentId: n.id, level: level === null ? c.level : toLevel(level + 1) });
      if (level !== null) descendantCount++;
      else if (code !== c.code) renumberedTotal++;
      descend(c, code, level === null ? null : level + 1);
    }
  };

  list.forEach((n, i) => {
    const isItem = n.id === id;
    const code = tails[i] > 0 ? joinCode(parentCode, tails[i]) : n.code;
    const level = isItem ? toLevel((parent ? levelNo(parent.level) : 0) + 1) : n.level;
    const change = push(n, { code, order: i, parentId: target.parentId, level });
    if (isItem) moved = change;
    else if (code !== n.code) {
      renumbered.push({ id: n.id, from: n.code, to: code });
      renumberedTotal++;
    }
    if (isItem || code !== n.code) descend(n, code, isItem ? levelNo(level) : null);
  });

  return { ok: true, item: moved!, changes, descendantCount, renumbered, renumberedTotal };
}
