/**
 * @file src/app/api/documents/[id]/file/route.ts
 * @description
 * 문서함 "서버 업로드" 파일을 올리고(PUT) 내려받는(GET) API입니다.
 *
 * 초보자 가이드:
 * - PUT: 요청 본문이 파일 자체다 (FormData 아님). 원본 파일명은 `x-file-name` 헤더에 encodeURIComponent 로 보낸다.
 *   본문을 메모리에 다 올리지 않고 디스크로 흘려 쓰며 200MB 를 넘으면 413. 성공하면 문서를 SERVER_UPLOAD 로 바꾸고
 *   파일 정보(filePath · fileName · fileSize · mimeType)를 저장한 뒤 예전 파일을 지운다.
 * - GET: 파일을 스트림으로 돌려준다. pdf · 이미지는 브라우저에서 바로 열고(inline), 나머지와 `?download=1` 은 내려받기.
 * - 권한: 로그인 + 문서 프로젝트 권한, 개인문서는 작성자 본인만 (문서 단건 API 와 같은 기준).
 * - 운영은 IIS 가 앞에 있어 IIS 업로드 한도(maxAllowedContentLength)도 200MB 보다 크게 둬야 한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/uploads";
import {
  MAX_DOCUMENT_FILE_BYTES,
  DOCUMENT_FILE_EXTENSIONS,
  FileTooLargeError,
  contentDisposition,
  documentFilePath,
  documentFileType,
  fileExtension,
  removeDocumentFile,
  resolveDocumentFile,
  writeStreamToFile,
} from "@/lib/document-files";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** 로그인 · 프로젝트 권한 · 개인문서 작성자 확인 후 문서 반환 */
async function loadDocument(params: RouteParams["params"]) {
  const { user, error } = await requireAuth();
  if (error) return { error };
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return { error: NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 }) };
  const denied = await assertProjectAccess(document.projectId, user!);
  if (denied) return { error: denied };
  if (document.isPersonal && document.createdById !== user!.id) {
    return { error: NextResponse.json({ error: "문서에 접근할 권한이 없습니다." }, { status: 403 }) };
  }
  return { document };
}

/**
 * 파일 올리기 (있으면 바꾸기)
 * PUT /api/documents/[id]/file
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { document, error } = await loadDocument(params);
    if (error) return error;

    let fileName = "";
    try {
      fileName = decodeURIComponent(request.headers.get("x-file-name") ?? "").trim();
    } catch {
      /* 잘못 인코딩된 이름은 아래에서 400 */
    }
    if (!fileName || fileName.length > 255 || /[\\/]/.test(fileName)) {
      return NextResponse.json({ error: "파일 이름이 올바르지 않습니다." }, { status: 400 });
    }
    const mimeType = documentFileType(fileName);
    if (!mimeType) {
      return NextResponse.json(
        { error: `올릴 수 없는 파일 형식입니다. 가능한 형식: ${DOCUMENT_FILE_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_DOCUMENT_FILE_BYTES) {
      return NextResponse.json({ error: new FileTooLargeError().message }, { status: 413 });
    }
    if (!request.body) return NextResponse.json({ error: "파일 내용이 없습니다." }, { status: 400 });

    const relativePath = documentFilePath(document.projectId, document.id, fileExtension(fileName));
    const absolute = resolveUploadPath(relativePath);
    if (!absolute) return NextResponse.json({ error: "잘못된 저장 경로입니다." }, { status: 400 });

    const size = await writeStreamToFile(request.body, absolute);
    if (size === 0) {
      await removeDocumentFile(relativePath);
      return NextResponse.json({ error: "빈 파일은 올릴 수 없습니다." }, { status: 400 });
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { sourceType: "SERVER_UPLOAD", url: null, filePath: relativePath, fileName, fileSize: size, mimeType },
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
    if (document.filePath && document.filePath !== relativePath) await removeDocumentFile(document.filePath);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof FileTooLargeError) return NextResponse.json({ error: error.message }, { status: 413 });
    console.error("문서 파일 업로드 실패:", error);
    return NextResponse.json({ error: "파일을 저장하지 못했습니다." }, { status: 500 });
  }
}

/**
 * 파일 내려받기
 * GET /api/documents/[id]/file  (?download=1 이면 항상 내려받기)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { document, error } = await loadDocument(params);
    if (error) return error;
    const absolute = resolveDocumentFile(document.filePath);
    const info = absolute ? await stat(absolute).catch(() => null) : null;
    if (!absolute || !info?.isFile()) {
      return NextResponse.json({ error: "올린 파일이 없습니다." }, { status: 404 });
    }
    const fileName = document.fileName || `document.${fileExtension(absolute)}`;
    const ext = fileExtension(fileName);
    const download = request.nextUrl.searchParams.get("download") === "1";
    const body = Readable.toWeb(createReadStream(absolute)) as ReadableStream<Uint8Array>;
    return new NextResponse(body, {
      headers: {
        "Content-Type": document.mimeType || documentFileType(fileName) || "application/octet-stream",
        "Content-Length": String(info.size),
        "Content-Disposition": contentDisposition(fileName, ext, download),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("문서 파일 내려받기 실패:", error);
    return NextResponse.json({ error: "파일을 읽지 못했습니다." }, { status: 500 });
  }
}
