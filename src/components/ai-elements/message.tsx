"use client";

import React from "react";
import { MessageRole } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface MessageProps {
  role: MessageRole;
  content?: string;
}

export function MessageItem({ role, content }: MessageProps) {
  const isUser = role === MessageRole.USER;

  return (
    <div
      className={cn(
        "flex w-full gap-4 py-4 text-sm animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-2xl px-4 py-3 rounded-2xl leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-white/[0.03] border border-white/[0.06] text-foreground rounded-bl-none"
        )}
      >
        <div
          className={cn(
            "prose prose-invert max-w-none text-sm leading-relaxed",
            "prose-p:m-0 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-code:text-xs"
          )}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
