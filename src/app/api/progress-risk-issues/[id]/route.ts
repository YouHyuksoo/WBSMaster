import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const existing = await prisma.progressRiskIssue.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const accessError = await assertProjectAccess(existing.projectId, user!);
  if (accessError) return accessError;

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.stageCategory !== undefined) {
    const category = body.stageCategory as StageCategory;
    if (!STAGE_CATEGORY_ORDER.includes(category)) {
      return NextResponse.json({ error: "Invalid stageCategory." }, { status: 400 });
    }
    data.stageCategory = category;
  }
  if (body.majorCategory !== undefined) data.majorCategory = String(body.majorCategory).trim();
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = nullableText(body.description);
  if (body.isScheduleRisk !== undefined) data.isScheduleRisk = Boolean(body.isScheduleRisk);
  if (body.targetDate !== undefined) data.targetDate = parseDate(body.targetDate);
  if (body.status !== undefined) data.status = body.status;
  if (body.needsEscalation !== undefined) data.needsEscalation = Boolean(body.needsEscalation);
  if (body.assignee !== undefined) data.assignee = nullableText(body.assignee);
  if (body.decisionMaker !== undefined) data.decisionMaker = nullableText(body.decisionMaker);
  if (body.submittedDate !== undefined) data.submittedDate = parseDate(body.submittedDate);
  if (body.resolvedDate !== undefined) data.resolvedDate = parseDate(body.resolvedDate);
  if (body.remarks !== undefined) data.remarks = nullableText(body.remarks);

  const updated = await prisma.progressRiskIssue.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const existing = await prisma.progressRiskIssue.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const accessError = await assertProjectAccess(existing.projectId, user!);
  if (accessError) return accessError;

  await prisma.progressRiskIssue.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted." });
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
