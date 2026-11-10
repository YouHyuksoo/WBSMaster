/**
 * @file src/app/api/to-be/trace/export/route.ts
 * @description TO-BE 추적표(AS-IS → TO-BE → SFR → WBS) 엑셀 다운로드 (3단계).
 * 초보자 가이드:
 * - GET ?projectId=xxx → .xlsx (시트 "추적표"). 행 · 칸은 traceSheetRows 가 정하고 화면 추적표와 같다
 * - 칸 너비(!cols)는 traceSheetRows 의 키 순서와 1:1 로 맞춘다 (11개)
 * - 인증: requireAuth + assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { buildTrace, loadSnapshot, traceSheetRows } from "@/lib/to-be/to-be-trace-service";

const COL_WIDTHS = [12, 30, 12, 30, 9, 14, 9, 36, 18, 34, 14];

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
  const denied = await assertProjectAccess(projectId, user!);
  if (denied) return denied;
  try {
    const rows = traceSheetRows(buildTrace(await loadSnapshot(projectId)));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = COL_WIDTHS.map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "추적표");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `to-be-trace-${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())}.xlsx`; // 한국 날짜 (UTC 로 하면 자정~09시에 전날이 된다)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("TO-BE 추적표 엑셀 실패:", err);
    return NextResponse.json({ error: "추적표 엑셀을 만들지 못했습니다." }, { status: 500 });
  }
}
