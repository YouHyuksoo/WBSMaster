/**
 * @file src/lib/interview-audio.ts
 * @description
 * 인터뷰 녹음 전사문을 인터뷰 등록 양식(5가지 항목)으로 정리합니다.
 *
 * 초보자 가이드:
 * - 전사는 회의록과 같은 transcribeWithOpenAI() 를 쓰고, 이 파일은 "전사문 → 인터뷰 초안" 만 맡는다.
 * - 5가지 항목: 현재 운영 방식(AS-IS) · 문제점 · 원하는 결과(TO-BE) · 기술적 제약 · 궁금한 점
 * - 녹취에 없는 내용은 지어내지 않는다(모르면 빈 값). 업무영역은 정해진 목록 중 하나만 받는다.
 * - generate 를 주입받아 테스트는 실제 LLM 을 부르지 않는다.
 */

import { extractJson } from "./meeting-minutes-ai";

/** 인터뷰 업무영역 (화면 BUSINESS_CATEGORIES 와 같은 목록) */
export const INTERVIEW_CATEGORIES = [
  "생산", "구매", "자재", "품질", "설계", "영업", "기술", "제조", "지원", "외주", "통관", "물류", "인사", "총무", "회계", "무역",
] as const;

/** 인터뷰 초안 (등록 창에 채울 값) */
export interface InterviewDraft {
  title: string;
  interviewDate: string;
  interviewer: string | null;
  interviewee: string | null;
  category: string | null;
  currentProcess: string | null;
  painPoints: string | null;
  desiredResults: string | null;
  technicalConstraints: string | null;
  questions: string | null;
}

/** 전사 힌트 (OpenAI transcriptions prompt) */
export const INTERVIEW_TRANSCRIBE_PROMPT = "한국어 현업 인터뷰 녹음입니다. MES, LOT, 인터락, 절곡, 작업지시, 실적 같은 업무 용어가 나옵니다.";

export const INTERVIEW_SYSTEM_PROMPT = `당신은 제조 현업 인터뷰 녹취록을 인터뷰 기록으로 정리하는 도우미입니다.

## 규칙
1. 녹취록에 있는 내용만 씁니다. 없는 사실 · 수치 · 사람 이름을 지어내지 않습니다. 해당 내용이 없으면 null 입니다.
2. title: 인터뷰 주제를 한 줄로 씁니다 (예: "절곡 공정 실적 처리 방식 인터뷰").
3. interviewDate: 녹취록에 날짜가 나오면 그 날짜, 없으면 입력에 준 "기본 인터뷰 일자"를 씁니다 (YYYY-MM-DD).
4. interviewer(진행자) · interviewee(대상자, 소속 포함 가능): 녹취에서 확인될 때만 씁니다.
5. category: 다음 중 하나만 씁니다. 판단이 어렵으면 null. ${INTERVIEW_CATEGORIES.join(", ")}
6. 다섯 항목은 각각 "- " 로 시작하는 줄 목록으로 씁니다. 한 줄에 한 가지 사실만, 현업이 한 말의 뜻을 살려 간결하게.
   - currentProcess: 현재 운영 방식 (AS-IS, 지금 어떻게 일하는지)
   - painPoints: 문제점 · 불편 · 오류 · 시간 낭비
   - desiredResults: 원하는 결과 (TO-BE, 바라는 기능 · 개선)
   - technicalConstraints: 설비 · 시스템 · 데이터 · 일정 같은 기술적 제약
   - questions: 아직 답이 없는 질문 · 확인이 필요한 사항

## 응답 형식 (JSON 만 출력)
{"title":"","interviewDate":"YYYY-MM-DD","interviewer":null,"interviewee":null,"category":null,
"currentProcess":null,"painPoints":null,"desiredResults":null,"technicalConstraints":null,"questions":null}`;

const text = (v: unknown): string | null => {
  if (Array.isArray(v)) v = v.map((x) => `- ${String(x).replace(/^-\s*/, "")}`).join("\n");
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.toLowerCase() !== "null" ? t : null;
};

/** LLM 응답 → 인터뷰 초안 (검사 · 정리). 제목이 없으면 오류 */
export function parseInterviewDraft(raw: string, defaultDate: string): { draft: InterviewDraft | null; error: string | null } {
  let data: Record<string, unknown>;
  try {
    const parsed = extractJson(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("객체가 아님");
    data = parsed as Record<string, unknown>;
  } catch {
    return { draft: null, error: "AI 응답을 인터뷰 형식으로 읽지 못했습니다. 다시 시도해 주세요." };
  }
  const title = text(data.title);
  if (!title) return { draft: null, error: "AI 가 인터뷰 제목을 만들지 못했습니다. 녹음 내용을 확인해 주세요." };
  const date = text(data.interviewDate);
  const category = text(data.category);
  return {
    draft: {
      title: title.slice(0, 200),
      interviewDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : defaultDate,
      interviewer: text(data.interviewer),
      interviewee: text(data.interviewee),
      category: category && (INTERVIEW_CATEGORIES as readonly string[]).includes(category) ? category : null,
      currentProcess: text(data.currentProcess),
      painPoints: text(data.painPoints),
      desiredResults: text(data.desiredResults),
      technicalConstraints: text(data.technicalConstraints),
      questions: text(data.questions),
    },
    error: null,
  };
}

/** 전사문 → 인터뷰 초안 */
export async function structureInterviewTranscript(
  generate: (prompt: string, systemPrompt: string) => Promise<string>,
  transcript: string,
  defaultDate: string
): Promise<{ draft: InterviewDraft | null; error: string | null }> {
  const raw = await generate(`기본 인터뷰 일자: ${defaultDate}\n\n## 녹취록\n${transcript.slice(0, 120_000)}`, INTERVIEW_SYSTEM_PROMPT);
  return parseInterviewDraft(raw, defaultDate);
}
