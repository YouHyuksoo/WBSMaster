/**
 * @file src/app/api/meeting-minutes/route.ts
 * @description
 * 회의록 목록 조회 및 생성 API입니다.
 *
 * 초보자 가이드:
 * - GET /api/meeting-minutes?projectId=&search=: 목록 조회 (내용 항목 포함, 최근 일자 순)
 * - POST /api/meeting-minutes: 생성. 문서번호(YYYYMMDD-NNN)는 서버가 회의 일자별로 부여한다.
 * - 로그인(requireAuth)과 프로젝트 권한(assertProjectAccess)을 모두 확인한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { buildMinuteCode, dateKey, normalizeItems, pickMinuteFields } from "@/lib/meeting-minutes";

const includeItems = { items: { orderBy: { sortOrder: "asc" as const } } };

/** 회의록 목록 조회 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId 는 필수입니다." }, { status: 400 });
  }
  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const search = searchParams.get("search")?.trim();
  try {
    const minutes = await prisma.meetingMinute.findMany({
      where: {
        projectId,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" as const } },
                { title: { contains: search, mode: "insensitive" as const } },
                { attendees: { contains: search, mode: "insensitive" as const } },
                { items: { some: { content: { contains: search, mode: "insensitive" as const } } } },
              ],
            }
          : {}),
      },
      include: includeItems,
      orderBy: [{ meetingDate: "desc" }, { code: "desc" }],
    });
    return NextResponse.json(minutes);
  } catch (error) {
    console.error("회의록 목록 조회 실패:", error);
    return NextResponse.json({ error: "회의록 목록을 불러올 수 없습니다." }, { status: 500 });
  }
}

/** 회의록 생성 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await request.json()) as Record<string, unknown>;
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) {
    return NextResponse.json({ error: "projectId 는 필수입니다." }, { status: 400 });
  }
  if (!("title" in body) || !("meetingDate" in body)) {
    return NextResponse.json({ error: "회의 목적과 일자는 필수입니다." }, { status: 400 });
  }
  const { fields, error: fieldError } = pickMinuteFields(body);
  if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  try {
    const meetingDate = fields.meetingDate!;
    const created = await prisma.$transaction(async (tx) => {
      const last = await tx.meetingMinute.findFirst({ where: { projectId }, orderBy: { sequence: "desc" } });
      const sameDay = await tx.meetingMinute.findMany({
        where: { projectId, code: { startsWith: `${dateKey(meetingDate)}-` } },
        select: { code: true },
      });
      return tx.meetingMinute.create({
        data: {
          ...fields,
          title: fields.title!,
          meetingDate,
          projectId,
          sequence: (last?.sequence ?? 0) + 1,
          code: buildMinuteCode(meetingDate, sameDay.map((m) => m.code)),
          items: { create: normalizeItems(body.items) },
        },
        include: includeItems,
      });
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("회의록 생성 실패:", error);
    return NextResponse.json({ error: "회의록을 생성할 수 없습니다." }, { status: 500 });
  }
}
