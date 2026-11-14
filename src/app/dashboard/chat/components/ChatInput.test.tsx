/**
 * @file src/app/dashboard/chat/components/ChatInput.test.tsx
 * @description 제안 선택·전송 및 프로젝트 대기 중 입력 보존을 확인합니다.
 * 초보자 가이드: 음성 기능과 토스트를 목 처리하며 전송 콜백만 관찰합니다.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("../hooks/useOpenAIVoice", () => ({ useVoiceRecorder: () => ({ supported: false }) }));
vi.mock("@/components/ui", async importOriginal => ({ ...await importOriginal<object>(), useToast: () => ({ error: vi.fn() }) }));
import ChatInput from "./ChatInput";
const props = () => ({ onSendMessage: vi.fn(), onFileSelect: vi.fn(), selectedFile: null, onClearFile: vi.fn(), targetType: "task" as const, onTargetTypeChange: vi.fn(), onExcelUpload: vi.fn(), isLoading: false, isUploadingExcel: false, selectedProjectId: "p1" });

it("프로젝트 대기 중 Enter는 입력을 보존하고 전송하지 않는다", () => {
  const p = { ...props(), selectedProjectId: "" };
  render(<ChatInput {...p} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "지연 항목 보여줘" } });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  expect(p.onSendMessage).not.toHaveBeenCalled();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("지연 항목 보여줘");
});
it("한글 조합을 끝내는 Enter로 전송하지 않는다", () => {
  const p = props(); render(<ChatInput {...p} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "조회해줘" } });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", isComposing: true });
  expect(p.onSendMessage).not.toHaveBeenCalled();
});
it("제안은 입력·포커스만 하고 전송 버튼으로 실행한다", async () => {
  const p = props(); render(<ChatInput {...p} suggestedInput="지연 WBS 보여줘" />);
  await waitFor(() => expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("지연 WBS 보여줘"));
  expect(document.activeElement).toBe(screen.getByRole("textbox"));
  expect(p.onSendMessage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /전송/ }));
  expect(p.onSendMessage).toHaveBeenCalledWith("지연 WBS 보여줘");
});
it("문서 분석 모드에서는 첨부와 사용자 메시지를 함께 전송한다", () => {
  const p = { ...props(), targetType: "intake" as const, selectedFile: new File(["현행 방식"], "interview.txt", { type: "text/plain" }) };
  render(<ChatInput {...p} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "인터뷰관리에 등록해줘" } });
  fireEvent.click(screen.getByRole("button", { name: /전송/ }));
  expect(p.onSendMessage).toHaveBeenCalledWith("인터뷰관리에 등록해줘");
  expect(p.onExcelUpload).not.toHaveBeenCalled();
});
