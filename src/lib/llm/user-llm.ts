/**
 * @file src/lib/llm/user-llm.ts
 * @description
 * 로그인 사용자의 AI 설정(설정 페이지)으로 LLM generate 함수를 만듭니다.
 *
 * 초보자 가이드:
 * - getUserLLM(userId): 설정이 있으면 { generate, label }, 없거나 잘못되면 { error } (화면에 보일 문구)
 * - label 은 "OpenAI gpt-4.1" 처럼 어떤 AI 로 만들었는지 기록할 때 쓴다.
 * - 회의록 엑셀 가져오기 · 회의록 AI 분석이 같이 쓴다.
 */

import { prisma } from "@/lib/prisma";
import { createLLMClient, resolveLLMConfig } from "@/lib/llm";
import { providerBadge } from "@/lib/llm/config";

export type UserLLM =
  | { generate: (prompt: string, systemPrompt: string) => Promise<string>; label: string; error?: undefined }
  | { error: string };

export async function getUserLLM(userId: string): Promise<UserLLM> {
  const setting = await prisma.aiSetting.findUnique({ where: { userId } });
  if (!setting) return { error: "AI 설정이 없습니다. 설정 페이지에서 AI 제공자를 등록하세요." };
  const resolved = resolveLLMConfig(setting);
  if (!resolved.ok) return { error: resolved.error };
  const client = createLLMClient(resolved.config);
  return { generate: (prompt, systemPrompt) => client.generate(prompt, systemPrompt), label: providerBadge(setting) };
}
