"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, Loader2, SendHorizontal, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/types";
import { ChatMessageBubble } from "./chat-message";
import { ChatEmptyState } from "./empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatPanelProps {
  title: string;
  description?: string;
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSend: () => void;
  onClear: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  placeholder?: string;
  /** Optional extra header content, e.g. active persona badge. */
  headerExtra?: React.ReactNode;
}

/**
 * Shared chat surface (message history + input box + states) reused by
 * every experiment page. Pages only need to supply a `useChat(...)` result
 * and any assignment-specific config panel alongside it.
 */
export function ChatPanel({
  title,
  description,
  messages,
  input,
  setInput,
  loading,
  error,
  onSend,
  onClear,
  emptyTitle,
  emptyHint,
  placeholder = "Type your message... (Enter to send, Shift+Enter for newline)",
  headerExtra,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="glass-panel flex flex-col h-full min-h-[560px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={messages.length === 0 && !error}
            className="text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-5">
        <div className="py-5 flex flex-col gap-5">
          {messages.length === 0 && !loading ? (
            <ChatEmptyState title={emptyTitle} hint={emptyHint} />
          ) : (
            messages.map((m) => <ChatMessageBubble key={m.id} message={m} />)
          )}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="max-h-40"
          />
          <Button onClick={() => onSend()} disabled={loading || !input.trim()} size="icon" className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
