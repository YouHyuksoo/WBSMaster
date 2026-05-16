import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id: projectId } = await params;
  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const plans = await prisma.progressCategoryPlan.findMany({
    where: { projectId },
    orderBy: { category: "asc" },
  });

  return NextResponse.json(plans);
}
