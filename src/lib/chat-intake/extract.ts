/**
 * @file src/lib/chat-intake/extract.ts
 * @description 자유 문서 전체를 위치별 텍스트로 추출합니다.
 * 초보자 가이드: 상한 초과·읽을 수 없는 페이지는 실패시키며 조용히 절단하지 않습니다.
 */
import { IntakeError, type SourceText } from "@/lib/chat-intake/types";
export const DOCUMENT_EXTENSIONS = ["txt", "md", "docx", "pdf", "xlsx", "xls", "csv"];
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_CHARS = 100_000;

/** ZIP 중앙 디렉터리의 압축 해제 크기를 파서 실행 전에 검사합니다. */
export function checkZip(buffer: Buffer) {
  let end = buffer.length - 22;
  while (end >= Math.max(0, buffer.length - 65557) && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < Math.max(0, buffer.length - 65557)) throw new IntakeError("압축 문서 형식이 올바르지 않습니다.");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16), expanded = 0;
  if (!count || count > 2000 || buffer.readUInt16LE(end + 4) !== 0) throw new IntakeError("문서의 압축 구성이 지원 범위를 넘습니다.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw new IntakeError("압축 문서가 손상되었습니다.");
    expanded += buffer.readUInt32LE(offset + 24);
    if (expanded > 20 * 1024 * 1024) throw new IntakeError("압축 해제한 문서는 20MB 이하여야 합니다.");
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

export async function extractDocument(name: string, data: Buffer, id: string): Promise<SourceText[]> {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!DOCUMENT_EXTENSIONS.includes(ext) || data.length > MAX_DOCUMENT_BYTES || !data.length) throw new IntakeError("지원 문서(txt, md, docx, pdf, xlsx, xls, csv)를 5MB 이하로 첨부해 주세요.");
  const segments: SourceText[] = [];
  let chars = 0;
  const add = (location: string, text: string) => {
    text = text.replace(/\u0000/g, "").trim();
    if (!text) return;
    chars += text.length;
    if (chars > MAX_CHARS) throw new IntakeError("문서가 10만 자를 넘습니다. 나누어 첨부해 주세요.");
    for (let n = 0; n < text.length; n += 6000) segments.push({ id, location: `${location}${text.length > 6000 ? ` / 부분 ${n / 6000 + 1}` : ""}`, text: text.slice(n, n + 6000) });
  };
  try {
    if (["docx", "xlsx"].includes(ext)) {
      if (data.readUInt32LE(0) !== 0x04034b50) throw new IntakeError("확장자와 문서 형식이 다릅니다.");
      checkZip(data);
    }
    if (ext === "pdf") {
      if (!data.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new IntakeError("PDF 형식이 올바르지 않습니다.");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(data), isEvalSupported: false });
      try {
        const info = await parser.getInfo();
        if (info.total > 100) throw new IntakeError("PDF는 100쪽 이하로 나누어 첨부해 주세요.");
        const result = await parser.getText();
        for (const page of result.pages) {
          if (!page.text.trim()) throw new IntakeError(`${page.num}쪽의 텍스트를 읽지 못했습니다. 스캔 자료는 텍스트 문서로 변환해 주세요.`);
          add(`${page.num}쪽`, page.text);
        }
      } finally { await parser.destroy(); }
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: data });
      result.value.split(/\n\s*\n/).forEach((text, i) => add(`${i + 1}문단`, text));
    } else if (["xlsx", "xls", "csv"].includes(ext)) {
      if (ext === "xls" && !data.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))) throw new IntakeError("xls 형식이 올바르지 않습니다.");
      const XLSX = await import("xlsx");
      const book = XLSX.read(data, { type: "buffer", cellDates: true, codepage: 65001 });
      if (book.SheetNames.length > 30) throw new IntakeError("시트는 30개 이하로 나누어 주세요.");
      for (const sheet of book.SheetNames) {
        const ws = book.Sheets[sheet];
        const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
        if (range && (range.e.r > 10000 || range.e.c > 200)) throw new IntakeError("표는 1만 행·200열 이하로 나누어 주세요.");
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false, blankrows: true });
        rows.forEach((row, i) => add(`${sheet} / ${i + 1}행`, row.join(" | ")));
      }
    } else {
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(data); }
      catch { throw new IntakeError("텍스트 파일을 UTF-8로 저장한 뒤 다시 첨부해 주세요."); }
      text.split(/\r?\n/).forEach((line, i) => add(`${i + 1}행`, line));
    }
  } catch (error) {
    if (error instanceof IntakeError) throw error;
    throw new IntakeError("문서를 읽지 못했습니다. 암호·손상 여부를 확인하고 텍스트를 추출할 수 있는 문서를 첨부해 주세요.");
  }
  if (!segments.length) throw new IntakeError("읽을 수 있는 텍스트가 없습니다. 스캔 자료는 텍스트로 변환해 주세요.");
  return segments;
}
