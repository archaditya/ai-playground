"use client";

import React, { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StickToBottom } from "@/components/ai-elements/conversation";
import { ChatEmpty } from "./chat-empty";
import { ChatComposer } from "./chat-composer";
import { MessageItem } from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { MessageRole } from "@/lib/generated/prisma";
import { UIMessage as DbMessage } from "@/features/ai/actions/chat-store";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface ConversationViewProps {
  conversationId: string;
  initialMessages: DbMessage[];
}

export function ConversationView({
  conversationId,
  initialMessages,
}: ConversationViewProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const {
    messages,
    status,
    sendMessage,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        id: conversationId,
      },
    }),
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as "user" | "assistant",
      parts: [{ type: "text", text: m.content }],
    })),
    onFinish: () => {
      // Invalidate React Query caches to instantly refresh the sidebar thread order/titles
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const isWaiting = isLoading && messages[messages.length - 1]?.role === "user";

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d] text-foreground">
      <header className="flex h-14 items-center gap-3 border-b border-white/[0.06] px-4 shrink-0">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]" />
        <div className="h-4 w-px bg-white/[0.08]" />
        <span className="text-xs font-medium text-muted-foreground truncate">
          Active Session
        </span>
      </header>

      {messages.length === 0 ? (
        <ChatEmpty />
      ) : (
        <StickToBottom>
          {messages.map((m, idx) => (
            <MessageItem
              key={m.id || idx}
              role={m.role === "user" ? MessageRole.USER : MessageRole.ASSISTANT}
              content={
                m.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
              }
            />
          ))}
          {isWaiting && (
            <div className="flex items-start gap-4 py-4 text-sm animate-fade-in">
              <div className="max-w-2xl px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-foreground rounded-bl-none">
                <Loader />
              </div>
            </div>
          )}
        </StickToBottom>
      )}

      <ChatComposer
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
