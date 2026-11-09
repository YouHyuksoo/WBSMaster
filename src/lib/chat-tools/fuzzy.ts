/**
 * @file src/lib/chat-tools/fuzzy.ts
 * @description
 * 사람 이름 퍼지 매칭입니다. 한글은 자모(초성·중성·종성)로 나눠 편집 거리를 재서 한 글자 오타("유혁스"→"유혁수")를 흡수합니다.
 *
 * 초보자 가이드:
 * - nameSimilarity(a, b): 0~1. 이름 앞부분만 입력한 경우("최종")는 0.8 을 하한으로 둔다.
 * - matchPeople(query, people): unique(최고점 ≥0.75, 2위와 차이 >0.1) / ambiguous(최고점 ≥0.75, 차이 ≤0.1) / none
 * - "님", "씨", "맴버", "멤버", "에게", "한테" 같은 꼬리는 지우고 비교한다.
 */

const CHO = 21 * 28; // 초성 하나당 음절 수 (중성 21 × 종성 28 = 588)
const SUFFIXES = ["맴버", "멤버", "에게", "한테", "님", "씨"];

/** 한글 음절을 자모 코드 배열로 (한글이 아니면 문자 그대로) */
function toJamo(s: string): string[] {
  const out: string[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out.push(ch.toLowerCase());
      continue;
    }
    const cho = Math.floor(code / CHO);
    const jung = Math.floor((code % CHO) / 28);
    const jong = code % 28;
    out.push(`c${cho}`, `v${jung}`);
    if (jong) out.push(`t${jong}`);
  }
  return out;
}

function levenshtein(a: string[], b: string[]): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 입력에서 호칭·조사 꼬리를 지운다 */
export function normalizeName(s: string): string {
  let n = s.replace(/\s+/g, "").trim();
  for (let changed = true; changed; ) {
    changed = false;
    for (const suf of SUFFIXES) {
      if (n.length > suf.length + 1 && n.endsWith(suf)) {
        n = n.slice(0, -suf.length);
        changed = true;
      }
    }
  }
  return n;
}

export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ja = toJamo(x);
  const jb = toJamo(y);
  let score = 1 - levenshtein(ja, jb) / Math.max(ja.length, jb.length);
  if (x.length >= 2 && y.startsWith(x)) score = Math.max(score, 0.8);
  return score;
}

export type PeopleMatch = {
  status: "unique" | "ambiguous" | "none";
  matches: { id: string; name: string; score: number }[];
};

export function matchPeople(query: string, people: { id: string; name: string }[]): PeopleMatch {
  const scored = people
    .map((p) => ({ id: p.id, name: p.name, score: nameSimilarity(query, p.name) }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 0.75) return { status: "none", matches: scored.filter((s) => s.score >= 0.5).slice(0, 3) };
  const close = scored.filter((s) => s.score >= 0.75 && top.score - s.score <= 0.1);
  if (close.length > 1) return { status: "ambiguous", matches: close.slice(0, 5) };
  return { status: "unique", matches: [top] };
}
