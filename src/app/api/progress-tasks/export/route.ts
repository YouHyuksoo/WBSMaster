/**
 * @file src/app/api/progress-tasks/export/route.ts
 * @description GET /api/progress-tasks/export?projectId=... — .xlsx 다운로드
 */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  HOLDING: "홀딩",
  DELAYED: "지연",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
  }

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const tasks = await prisma.progressTask.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: {
      assignees: {
        include: { user: { select: { name: true } } },
      },
      currentStageDef: { select: { name: true } },
    },
  });

  const rows = tasks.map((t) => ({
    코드: t.code ?? "",
    기능명: t.name,
    사업부: t.businessUnit ?? "",
    카테고리: t.stageCategory ? (STAGE_CATEGORY_LABEL[t.stageCategory as keyof typeof STAGE_CATEGORY_LABEL] ?? t.stageCategory) : "",
    대분류: t.category ?? "",
    설명: t.description ?? "",
    목표일자: t.endDate.toISOString().slice(0, 10),
    "현재 단계": t.currentStageDef?.name ?? "",
    상태: STATUS_LABEL[t.status] ?? t.status,
    "진행률(%)": t.progress,
    "공수(MD)": t.effortMd ?? "",
    "선행 task 코드": t.predecessorId
      ? tasks.find((x) => x.id === t.predecessorId)?.code ?? ""
      : "",
    "진행 방식": t.isParallel ? "병렬" : "순차",
    담당자: t.assignees
      .map((a) => {
        let assigneeStr = a.user.name;
        if (a.role) assigneeStr += `(${a.role})`;
        if (a.allocationPct !== 100) assigneeStr += ` ${a.allocationPct}%`;
        return assigneeStr;
      })
      .join(", "),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "진도리스크");

  ws["!cols"] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 9 },
    { wch: 9 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
  ];

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `progress-risk-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
