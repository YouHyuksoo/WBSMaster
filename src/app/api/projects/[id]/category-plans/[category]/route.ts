import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";

interface Ctx {
  params: Promise<{ id: string; category: string }>;
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: projectId, category: rawCategory } = await params;
  const category = rawCategory as StageCategory;
  if (!STAGE_CATEGORY_ORDER.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  if (user!.role !== "ADMIN") {
    const membership = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId, userId: user!.id } },
      select: { role: true },
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
      return NextResponse.json({ error: "No permission to update category plan." }, { status: 403 });
    }
  }

  const body = await request.json();
  const openDate = parseOpenDate((body as { openDate?: string | null }).openDate);
  if (openDate === "invalid") {
    return NextResponse.json({ error: "Invalid openDate." }, { status: 400 });
  }

  const plan = await prisma.progressCategoryPlan.upsert({
    where: { projectId_category: { projectId, category } },
    create: { projectId, category, openDate },
    update: { openDate },
  });

  return NextResponse.json(plan);
}

function parseOpenDate(value: string | null | undefined): Date | null | "invalid" {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "invalid" : parsed;
}
