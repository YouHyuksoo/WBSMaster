/**
 * @file src/lib/voice-intake.ts
 * @description
 * 음성 공통 파이프라인의 "종류별 정리" 규칙입니다. 녹음 종류: 회의록 · 인터뷰 · 요구사항 · 참고자료.
 *
 * 초보자 가이드:
 * - 전사(음성 → 글)는 종류와 상관없이 같고(voice-intake-run.ts), 이 파일은 "전사문 → 종류별 초안" 만 맡는다.
 *   · meeting   → 회의록 초안 (meeting-minutes-audio.ts structureTranscript 재사용)
 *   · interview → 인터뷰 초안 (interview-audio.ts structureInterviewTranscript 재사용)
 *   · requirement → 요구사항 여러 건 (기능명 · 내용 · 업무구분 · 요청자 · 적용방안)
 *   · reference → 참고자료 (제목 · 요약 · 핵심 내용) → 문서함 "참고자료" 로 녹음 파일과 함께 등록
 * - 녹취에 없는 내용은 지어내지 않는다(모르면 null). generate 를 주입받아 테스트는 실제 LLM 을 부르지 않는다.
 * - 화자 구분 전사문은 "[화자 A] ..." 줄이고, 긴 녹음은 "--- 구간 2/4 ---" 로 나뉜다. 구간마다 화자 표시가 새로 매겨지므로
 *   정리할 때 대화 내용으로 같은 사람을 맞춰 보라고 안내한다.
 */

import { extractJson } from "./meeting-minutes-ai";
import { structureTranscript } from "./meeting-minutes-audio";
import { structureInterviewTranscript } from "./interview-audio";

export const VOICE_KINDS = ["meeting", "interview", "requirement", "reference"] as const;
export type VoiceKind = (typeof VOICE_KINDS)[number];

export function isVoiceKind(v: unknown): v is VoiceKind {
  return typeof v === "string" && (VOICE_KINDS as readonly string[]).includes(v);
}


const SPEAKER_NOTE = `
## 화자 표시
녹취록 줄이 "[화자 A]" 처럼 시작하면 화자 구분 전사입니다. "--- 구간 n/m ---" 마다 화자 표시가 새로 매겨지니,
말투 · 역할 · 이름 언급으로 같은 사람을 맞춰 보고, 확신이 없으면 이름을 지어내지 말고 비워 둡니다.`;

export interface RequirementDraft {
  functionName: string;
  content: string;
  category: string | null;
  requester: string | null;
  solution: string | null;
}

export interface ReferenceDraft {
  title: string;
  summary: string;
  keyPoints: string[];
}

export const REQUIREMENT_SYSTEM_PROMPT = `당신은 업무 녹취록에서 시스템 요구사항을 뽑아 정리하는 도우미입니다.

## 규칙
1. 녹취록에서 사용자가 시스템에 바라는 기능 · 변경 · 개선만 뽑습니다. 단순 현황 설명 · 잡담은 넣지 않습니다.
2. 요구사항 하나에 한 가지 기능만. 비슷한 말이 여러 번 나오면 하나로 합칩니다. 최대 30건.
3. functionName: 기능 이름을 짧게 (예: "절곡 실적 자동 수집"). content: 무엇을 왜 바라는지 1~3문장.
4. category: 업무구분(예: 생산, 품질, 자재, 공통). requester: 요청한 사람 · 부서가 녹취에서 확인될 때만.
5. solution: 녹취에서 적용 방안이 논의됐을 때만. 없으면 null. 녹취에 없는 사실을 지어내지 않습니다.
${SPEAKER_NOTE}

## 응답 형식 (JSON 만 출력)
{"requirements":[{"functionName":"","content":"","category":null,"requester":null,"solution":null}]}`;

export const REFERENCE_SYSTEM_PROMPT = `당신은 업무 녹취록을 나중에 찾아볼 참고자료로 요약하는 도우미입니다.

## 규칙
1. title: 녹음 주제를 한 줄로 (60자 이내).
2. summary: 무엇에 관한 녹음인지, 결론 · 합의가 있으면 무엇인지 3~6문장으로.
3. keyPoints: 다시 찾아볼 만한 사실 · 수치 · 결정 · 할 일을 한 줄씩 (최대 15개).
4. 녹취록에 있는 내용만 씁니다. 없는 사실 · 수치 · 이름을 지어내지 않습니다.
${SPEAKER_NOTE}

## 응답 형식 (JSON 만 출력)
{"title":"","summary":"","keyPoints":[""]}`;

const str = (v: unknown, max = 2000): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.toLowerCase() !== "null" ? t.slice(0, max) : null;
};

const BAD_JSON = "AI 응답을 읽지 못했습니다. 다시 시도해 주세요.";

/** LLM 응답 → 요구사항 초안 목록 (기능명 · 내용이 없는 항목은 버린다) */
export function parseRequirementDrafts(raw: string): { drafts: RequirementDraft[]; error: string | null } {
  let list: unknown;
  try {
    list = (extractJson(raw) as { requirements?: unknown })?.requirements;
  } catch {
    return { drafts: [], error: BAD_JSON };
  }
  if (!Array.isArray(list)) return { drafts: [], error: BAD_JSON };
  const drafts = list
    .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : {}))
    .map((r) => ({
      functionName: str(r.functionName, 200) ?? "",
      content: str(r.content) ?? "",
      category: str(r.category, 50),
      requester: str(r.requester, 100),
      solution: str(r.solution),
    }))
    .filter((r) => r.functionName && r.content)
    .slice(0, 30);
  return drafts.length ? { drafts, error: null } : { drafts: [], error: "녹음에서 요구사항을 찾지 못했습니다." };
}

/** LLM 응답 → 참고자료 초안 */
export function parseReferenceDraft(raw: string): { draft: ReferenceDraft | null; error: string | null } {
  let data: Record<string, unknown>;
  try {
    const parsed = extractJson(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("객체가 아님");
    data = parsed as Record<string, unknown>;
  } catch {
    return { draft: null, error: BAD_JSON };
  }
  const title = str(data.title, 200);
  const summary = str(data.summary, 4000);
  if (!title || !summary) return { draft: null, error: "AI 가 요약을 만들지 못했습니다. 녹음 내용을 확인해 주세요." };
  const keyPoints = Array.isArray(data.keyPoints)
    ? data.keyPoints.map((k) => str(k, 500)).filter((k): k is string => !!k).slice(0, 15)
    : [];
  return { draft: { title, summary, keyPoints }, error: null };
}

type Generate = (prompt: string, systemPrompt: string) => Promise<string>;

/** 종류별 정리 결과 */
export type VoiceDraft =
  | { kind: "meeting"; minute: NonNullable<Awaited<ReturnType<typeof structureTranscript>>["minute"]> }
  | { kind: "interview"; interview: NonNullable<Awaited<ReturnType<typeof structureInterviewTranscript>>["draft"]> }
  | { kind: "requirement"; requirements: RequirementDraft[] }
  | { kind: "reference"; reference: ReferenceDraft };

/** 전사문 → 종류별 초안 */
export async function structureVoice(
  generate: Generate,
  kind: VoiceKind,
  transcript: string,
  defaultDate: string
): Promise<{ draft: VoiceDraft | null; error: string | null }> {
  const body = transcript.slice(0, 120_000);
  if (kind === "meeting") {
    const { minute, error } = await structureTranscript((p, s) => generate(p, s + SPEAKER_NOTE), body, defaultDate);
    return minute ? { draft: { kind, minute }, error: null } : { draft: null, error };
  }
  if (kind === "interview") {
    const { draft, error } = await structureInterviewTranscript((p, s) => generate(p, s + SPEAKER_NOTE), body, defaultDate);
    return draft ? { draft: { kind, interview: draft }, error: null } : { draft: null, error };
  }
  if (kind === "requirement") {
    const { drafts, error } = parseRequirementDrafts(await generate(`## 녹취록\n${body}`, REQUIREMENT_SYSTEM_PROMPT));
    return drafts.length ? { draft: { kind, requirements: drafts }, error: null } : { draft: null, error };
  }
  const { draft, error } = parseReferenceDraft(await generate(`## 녹취록\n${body}`, REFERENCE_SYSTEM_PROMPT));
  return draft ? { draft: { kind, reference: draft }, error: null } : { draft: null, error };
}
