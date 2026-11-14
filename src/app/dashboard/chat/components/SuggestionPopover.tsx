/**
 * @file src/app/dashboard/chat/components/SuggestionPopover.tsx
 * @description 제안을 입력창에 넣는 반응형 팝오버입니다.
 * 초보자 가이드: 선택 후 입력창으로 포커스를 돌리고 Escape로 닫습니다.
 */
import { Icon } from "@/components/ui";
import type { ExampleGroup } from "@/lib/chat-suggestions";

interface Props {
  suggestions: ExampleGroup[];
  onSelect(question: string): void;
  onClose(): void;
  onRefresh?: () => void;
  refreshing: boolean;
  disabled: boolean;
}
export function SuggestionPopover({ suggestions, onSelect, onClose, onRefresh, refreshing, disabled }: Props) {
  return (
    <div id="chat-suggestion-popover" role="dialog" aria-label="제안 질문" onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
      className="absolute bottom-full left-4 right-4 mb-2 max-w-[800px] max-h-[min(400px,60vh)] overflow-y-auto p-4 rounded-xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-xl z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text dark:text-white">제안 질문</h3>
        <div className="flex items-center gap-2">
          {onRefresh && <button onClick={onRefresh} disabled={refreshing || disabled} title="AI에게 새로운 제안 요청" aria-label="제안 새로고침"
            className="p-1 rounded hover:bg-primary/10 text-text-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary">
            <Icon name="refresh" size="xs" className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />
          </button>}
          <button onClick={onClose} aria-label="제안 닫기" className="p-1 rounded hover:bg-background dark:hover:bg-background-dark focus-visible:outline-2 focus-visible:outline-primary">
            <Icon name="close" size="xs" className="text-text-secondary" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {suggestions.map(group => <div key={group.title}>
          <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-border dark:border-border-dark">
            <Icon name={group.icon} size="xs" className={group.color} />
            <span className="text-xs font-semibold text-text dark:text-white">{group.title}</span>
          </div>
          <div className="space-y-1">
            {group.questions.map(question => <button key={question} onClick={() => onSelect(question)} disabled={disabled} title="입력창에 넣기"
              className="w-full text-left text-xs leading-relaxed py-1.5 px-2 rounded hover:bg-primary/10 text-text-secondary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary">
              {question}
            </button>)}
          </div>
        </div>)}
      </div>
    </div>
  );
}
