import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const stageCategory = searchParams.get("stageCategory") as StageCategory | null;
  const majorCategory = searchParams.get("majorCategory");
  const status = searchParams.get("status");

  const issues = await prisma.progressRiskIssue.findMany({
    where: {
      projectId,
      ...(stageCategory ? { stageCategory } : {}),
      ...(majorCategory ? { majorCategory } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: [
      { needsEscalation: "desc" },
      { isScheduleRisk: "desc" },
      { targetDate: "asc" },
      { submittedDate: "desc" },
    ],
  });

  return NextResponse.json(issues);
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const projectId = body.projectId as string | undefined;
  const stageCategory = body.stageCategory as StageCategory | undefined;
  const majorCategory = String(body.majorCategory ?? "").trim();
  const title = String(body.title ?? "").trim();

  if (!projectId || !stageCategory || !majorCategory || !title) {
    return NextResponse.json({ error: "projectId, stageCategory, majorCategory, title are required." }, { status: 400 });
  }
  if (!STAGE_CATEGORY_ORDER.includes(stageCategory)) {
    return NextResponse.json({ error: "Invalid stageCategory." }, { status: 400 });
  }

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const issue = await prisma.progressRiskIssue.create({
    data: {
      projectId,
      stageCategory,
      majorCategory,
      title,
      description: nullableText(body.description),
      isScheduleRisk: body.isScheduleRisk ?? true,
      targetDate: parseDate(body.targetDate),
      status: body.status ?? "OPEN",
      needsEscalation: body.needsEscalation ?? false,
      assignee: nullableText(body.assignee),
      decisionMaker: nullableText(body.decisionMaker),
      submittedDate: parseDate(body.submittedDate) ?? new Date(),
      resolvedDate: parseDate(body.resolvedDate),
      remarks: nullableText(body.remarks),
    },
  });

  return NextResponse.json(issue, { status: 201 });
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
