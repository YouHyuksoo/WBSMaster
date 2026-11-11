// @vitest-environment node
/**
 * @file src/lib/chat-intake/extract.test.ts
 * @description 실제 파일 바이트로 문서별 추출·위치·상한을 검사합니다.
 * 초보자 가이드: 원본 고객 문서 대신 테스트에서 만든 문서를 사용합니다.
 */
import { describe, expect, it } from "vitest";
import { extractDocument } from "./extract";
import * as XLSX from "xlsx";
import JSZip from "jszip";

function pdf(text: string) {
  const content = `BT /F1 12 Tf 20 70 Td (${text}) Tj ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let out = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const start = out.length;
  out += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(out);
}
describe("문서 텍스트 추출", () => {
  it("UTF-8 텍스트의 행 위치를 보존한다", async () => {
    const out = await extractDocument("인터뷰.txt", Buffer.from("첫 번째\n두 번째"), "a");
    expect(out).toEqual([{ id: "a", location: "1행", text: "첫 번째" }, { id: "a", location: "2행", text: "두 번째" }]);
  });
  it("Markdown과 CSV를 전체 행으로 읽는다", async () => {
    expect((await extractDocument("a.md", Buffer.from("# 주간보고\n실적 내용"), "a")).at(-1)?.text).toBe("실적 내용");
    expect((await extractDocument("a.csv", Buffer.from('제목,내용\n개발,"저장,조회"'), "a")).at(-1)?.text).toBe("개발 | 저장,조회");
  });
  it("기존 xls 파일도 지원한다", async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["제목"], ["이슈 검토"]]), "이슈");
    expect((await extractDocument("issue.xls", XLSX.write(book, { type: "buffer", bookType: "biff8" }), "a")).at(-1)?.text).toBe("이슈 검토");
  });
  it("표의 시트·행 위치와 끝행을 보존한다", async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["제목", "내용"], ["첫 업무", "실적"], ["끝 업무", "계획"]]), "보고서");
    const out = await extractDocument("보고서.xlsx", XLSX.write(book, { type: "buffer", bookType: "xlsx" }), "a");
    expect(out.at(-1)).toMatchObject({ location: "보고서 / 3행", text: "끝 업무 | 계획" });
  });
  it("Word 문서의 한글 문단을 읽는다", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>생산 실적 인터뷰</w:t></w:r></w:p><w:p><w:r><w:t>현재 엑셀을 사용한다.</w:t></w:r></w:p></w:body></w:document>');
    const out = await extractDocument("interview.docx", await zip.generateAsync({ type: "nodebuffer" }), "a");
    expect(out).toEqual([{ id: "a", location: "1문단", text: "생산 실적 인터뷰" }, { id: "a", location: "2문단", text: "현재 엑셀을 사용한다." }]);
  });
  it("작은 압축 파일이라도 압축 해제 크기가 크면 거부한다", async () => {
    const zip = new JSZip(); zip.file("word/document.xml", Buffer.alloc(21 * 1024 * 1024, 65));
    const data = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    await expect(extractDocument("large.docx", data, "a")).rejects.toThrow("20MB");
  });
  it("실제 PDF에서 페이지별 텍스트를 읽는다", async () => {
    const out = await extractDocument("sample.pdf", pdf("Weekly result"), "a");
    expect(out[0]).toMatchObject({ location: "1쪽" });
    expect(out[0].text).toContain("Weekly result");
  });
  it("스캔·빈 PDF를 성공으로 처리하지 않는다", async () => expect(extractDocument("scan.pdf", pdf(""), "a")).rejects.toThrow("텍스트"));
  it("잘못된 서명과 초과 자료를 거부한다", async () => {
    await expect(extractDocument("fake.pdf", Buffer.from("fake PDF"), "a")).rejects.toThrow("PDF");
    await expect(extractDocument("large.txt", Buffer.from("x".repeat(100001)), "a")).rejects.toThrow("10만 자");
  });
});
