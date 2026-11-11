/**
 * @file src/app/dashboard/chat/components/ChatInput.test.tsx
 * @description 문서 첨부 모드의 메시지 전송을 확인합니다.
 * 초보자 가이드: 음성 기능과 토스트를 목 처리하며 전송 콜백만 관찰합니다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("../hooks/useOpenAIVoice", () => ({ useVoiceRecorder: () => ({ supported: false }) }));
vi.mock("@/components/ui", async importOriginal => ({ ...await importOriginal<object>(), useToast: () => ({ error: vi.fn() }) }));
import ChatInput from "./ChatInput";
const props = () => ({ onSendMessage: vi.fn(), onFileSelect: vi.fn(), selectedFile: null, onClearFile: vi.fn(), targetType: "task" as const, onTargetTypeChange: vi.fn(), onExcelUpload: vi.fn(), isLoading: false, isUploadingExcel: false, selectedProjectId: "p1" });

it("문서 분석 모드에서는 첨부와 사용자 메시지를 함께 전송한다", () => {
  const p = { ...props(), targetType: "intake" as const, selectedFile: new File(["현행 방식"], "interview.txt", { type: "text/plain" }) };
  render(<ChatInput {...p} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "인터뷰관리에 등록해줘" } });
  fireEvent.click(screen.getByRole("button", { name: /전송/ }));
  expect(p.onSendMessage).toHaveBeenCalledWith("인터뷰관리에 등록해줘");
  expect(p.onExcelUpload).not.toHaveBeenCalled();
});
