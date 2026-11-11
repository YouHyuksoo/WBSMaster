/**
 * @file src/lib/chat-intake/date-evidence.ts
 * @description 상대 날짜는 사용자 답변 시각의 한국 날짜로만 해석합니다.
 * 초보자 가이드: 문서에 날짜가 없을 때 오늘 날짜를 임의로 넣지 않습니다.
 */
import type { Evidence, SourceText } from "@/lib/chat-intake/types";
const offsets: Record<string, number> = { 오늘: 0, 어제: -1, 그제: -2, 내일: 1, 모레: 2, 이번주: 0, 지난주: -7, 다음주: 7 };
export function relativeDateSources(message: string, requestId: string, now = new Date()): SourceText[] {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return [...message.matchAll(/오늘|어제|그제|내일|모레|이번\s*주|지난\s*주|다음\s*주/g)].map((match) => {
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offsets[match[0].replace(/\s/g, "")]);
    return { id: `relative:${requestId}`, location: "상대 날짜 기준", text: `사용자 표현 '${match[0]}'의 한국 날짜 기준은 ${date.toISOString().slice(0, 10)}입니다. 주 표현은 그 날짜가 포함된 주입니다.` };
  });
}
export function hasDateEvidence(value: string, evidence: Evidence[], sources: SourceText[]): boolean {
  for (const e of evidence) {
    const dates = [...e.quote.matchAll(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/g)];
    if (dates.some((m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` === value)) return true;
    const relative = e.quote.match(/오늘|어제|그제|내일|모레|이번\s*주|지난\s*주|다음\s*주/);
    if (relative && sources.some((s) => s.location === "상대 날짜 기준" && s.text.includes(`'${relative[0]}'`) && s.text.includes(value))) return true;
  }
  return false;
}
