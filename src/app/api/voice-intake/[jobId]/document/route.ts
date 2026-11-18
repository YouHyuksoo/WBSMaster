/**
 * @file src/app/api/voice-intake/[jobId]/document/route.ts
 * @description
 * "참고자료" 로 정리한 녹음을 문서함에 등록하는 API입니다. 서버에 있는 원본 녹음을 그대로 문서 파일로 옮깁니다 (다시 올리지 않음).
 *
 * 초보자 가이드:
 * - POST { name, description, isPersonal } → 문서함 "참고자료"(SERVER_UPLOAD) 문서를 만들고 원본 녹음을 문서 파일 폴더로 복사한다.
 * - 참고자료 작업이고 정리가 끝난(done) 작업만, 만든 사용자만 등록할 수 있다. 한 작업은 한 번만 등록된다.
 * - 등록이 끝나면 작업의 임시 폴더(원본)를 지운다.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { copyFile, mkdir, stat } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/uploads";
import { documentFilePath, documentFileType, fileExtension } from "@/lib/document-files";
import { getVoiceJob, removeVoiceJob, updateVoiceJob } from "@/lib/voice-jobs";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { jobId } = await params;
  const job = getVoiceJob(jobId);
  if (!job || job.userId !== user!.id) return bad("작업을 찾을 수 없습니다 (서버가 재시작됐거나 1시간이 지났습니다).", 404);
  if (job.kind !== "reference" || job.stage !== "done") return bad("정리가 끝난 참고자료 작업만 문서함에 등록할 수 있습니다.");
  if (job.documentId) return bad("이미 문서함에 등록했습니다.", 409);
  const denied = await assertProjectAccess(job.projectId, user!);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; description?: unknown; isPersonal?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!name) return bad("문서명을 입력하세요.");
  const description = typeof body.description === "string" ? body.description : null;
  const isPersonal = body.isPersonal === true;

  const ext = fileExtension(job.fileName);
  const source = path.join(job.tempDir, `input.${ext}`);
  const info = await stat(source).catch(() => null);
  if (!info?.isFile()) return bad("서버에 원본 녹음이 남아 있지 않습니다. 다시 올려 주세요.", 410);

  const last = await prisma.document.findFirst({
    where: { projectId: job.projectId, isPersonal, ...(isPersonal ? { createdById: user!.id } : {}) },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const document = await prisma.document.create({
    data: {
      projectId: job.projectId, name, description, category: "REFERENCE", version: "1.0", sourceType: "SERVER_UPLOAD",
      tags: ["음성"], order: (last?.order ?? 0) + 1, isPersonal, createdById: user!.id,
    },
  });
  try {
    const relativePath = documentFilePath(job.projectId, document.id, ext);
    const target = resolveUploadPath(relativePath);
    if (!target) throw new Error("잘못된 저장 경로");
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target); // 임시 폴더와 업로드 폴더가 다른 드라이브일 수 있어 rename 대신 복사
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { filePath: relativePath, fileName: job.fileName, fileSize: info.size, mimeType: documentFileType(job.fileName) ?? job.mimeType },
    });
    updateVoiceJob(job.id, { documentId: document.id });
    await removeVoiceJob(job.id).catch(() => {});
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    await prisma.document.delete({ where: { id: document.id } }).catch(() => {});
    console.error("음성 참고자료 등록 실패:", error);
    return bad("문서함에 등록하지 못했습니다.", 500);
  }
}
