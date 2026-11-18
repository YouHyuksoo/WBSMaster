/**
 * @file src/app/api/meeting-minutes/[id]/analysis/route.ts
 * @description
 * 회의록 AI 분석(요약 · 해설 · 논리적 모순 · 액션 항목 · 추가 확인) 조회 · 실행 API입니다.
 *
 * 초보자 가이드:
 * - GET  /api/meeting-minutes/[id]/analysis: 저장된 분석 { analysis } (없으면 null).
 *   stale = 분석 뒤 회의록 내용이 바뀜 (화면이 "다시 분석" 을 권한다)
 * - POST /api/meeting-minutes/[id]/analysis: 분석 시작. 바로 202 + RUNNING 을 돌려주고 분석은 응답 뒤(after)에 이어 한다.
 *   LLM 호출이 길어 요청 하나로 기다리면 운영 프록시(IIS) 제한 시간에 끊기기 때문이다. 화면은 GET 으로 상태를 묻는다.
 * - 이미 분석 중이면 새로 시작하지 않고 진행 중인 상태를 돌려준다. 다시 분석하는 동안 이전 결과는 그대로 보인다.
 * - LLM 은 로그인 사용자의 AI 설정(설정 페이지)을 쓴다. 없으면 400.
 * - 레코드를 먼저 읽고 그 projectId 로 권한을 확인한다 (requireAuth + assertProjectAccess).
 */

import { NextRequest, NextResponse, after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess, type AuthUser } from "@/lib/auth";
import { getUserLLM } from "@/lib/llm/user-llm";
import { analyzeMeetingMinute, effectiveAnalysisStatus, minuteSourceHash } from "@/lib/meeting-minutes-analysis";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const includeAll = { items: { orderBy: { sortOrder: "asc" as const } }, analysis: true };

type LoadedMinute = Prisma.MeetingMinuteGetPayload<{ include: typeof includeAll }>;

/** 레코드(내용 항목 · 분석 포함) + 프로젝트 권한 확인 */
async function loadGuarded(id: string, user: AuthUser) {
  const minute = await prisma.meetingMinute.findUnique({ where: { id }, include: includeAll });
  if (!minute) return { denied: NextResponse.json({ error: "회의록을 찾을 수 없습니다." }, { status: 404 }) };
  const accessError = await assertProjectAccess(minute.projectId, user);
  return accessError ? { denied: accessError } : { minute };
}

/** 화면용 분석 응답 */
function serialize(minute: LoadedMinute) {
  const row = minute.analysis;
  if (!row) return null;
  const { status, error } = effectiveAnalysisStatus(row);
  return {
    status,
    error,
    result: row.result,
    stale: !!row.result && row.sourceHash !== minuteSourceHash(minute),
    model: row.model,
    requestedByName: row.requestedByName,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

/** 저장된 분석 조회 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { id } = await params;

  const { minute, denied } = await loadGuarded(id, user!);
  if (denied) return denied;
  return NextResponse.json({ analysis: serialize(minute) });
}

/** 분석 시작 (202) */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { id } = await params;

  const { minute, denied } = await loadGuarded(id, user!);
  if (denied) return denied;
  if (minute.items.length === 0) {
    return NextResponse.json({ error: "회의 내용이 없어 분석할 수 없습니다. 회의 내용을 먼저 입력하세요." }, { status: 400 });
  }
  if (minute.analysis && effectiveAnalysisStatus(minute.analysis).status === "RUNNING") {
    return NextResponse.json({ analysis: serialize(minute) }, { status: 202 });
  }

  const llm = await getUserLLM(user!.id);
  if (llm.error !== undefined) return NextResponse.json({ error: llm.error }, { status: 400 });

  // 시작할 때는 상태만 바꾼다. 결과 · 해시 · 모델 · 요청자 · 완료 시각은 "지금 보이는 결과"의 정보라
  // 새 분석이 성공했을 때만 함께 바꾼다 (다시 분석이 실패해도 이전 결과의 정보가 맞게 남는다)
  const startedAt = new Date();
  const sourceHash = minuteSourceHash(minute);
  const row = await prisma.meetingMinuteAnalysis.upsert({
    where: { minuteId: id },
    create: { minuteId: id, status: "RUNNING", sourceHash, startedAt },
    update: { status: "RUNNING", error: null, startedAt },
  });

  const requestedByName = user!.name ?? user!.email;
  after(async () => {
    const outcome = await analyzeMeetingMinute(llm.generate, minute);
    // 이 분석을 시작한 요청만 결과를 쓴다 (그사이 새로 시작된 분석을 덮어쓰지 않게)
    await prisma.meetingMinuteAnalysis
      .updateMany({
        where: { minuteId: id, startedAt },
        data: outcome.ok
          ? {
              status: "DONE",
              error: null,
              result: outcome.result as unknown as Prisma.InputJsonValue,
              sourceHash,
              model: llm.label,
              requestedById: user!.id,
              requestedByName,
              completedAt: new Date(),
            }
          : { status: "ERROR", error: outcome.error },
      })
      .catch((error) => console.error("회의록 AI 분석 결과 저장 실패:", error));
  });

  return NextResponse.json({ analysis: serialize({ ...minute, analysis: row }) }, { status: 202 });
}
