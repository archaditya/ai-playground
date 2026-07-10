"use client";

import { useState } from "react";
import { Bot, Check, Copy, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types";
import { cn, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const customBadge = !isUser && message.meta?.short ? (message.meta.short as string) : null;
  const customColor = !isUser && message.meta?.color ? (message.meta.color as string) : null;

  return (
    <div className={cn("flex gap-3 group animate-fade-in", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold shadow-sm select-none",
          isUser
            ? "bg-primary/15 border-primary/30 text-primary"
            : customColor
              ? `${customColor} border-transparent text-white`
              : "bg-white/[0.04] border-white/10 text-foreground/70"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : customBadge ? (
          <span>{customBadge}</span>
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div className={cn("max-w-[80%] flex flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed prose-chat",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "glass rounded-tl-sm text-foreground/95"
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>

        <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleCopy}
              title="Copy response"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
