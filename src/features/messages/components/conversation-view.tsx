"use client";

import React, { useState, useEffect } from "react";
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
import { ToolInvocationCard } from "@/components/ai-elements/tool-invocation-card";
import { createBranch } from "@/features/branch/actions/branch-actions";
import { useRouter } from "next/navigation";

interface ConversationViewProps {
  conversationId: string;
  initialMessages: DbMessage[];
}

export function ConversationView({
  conversationId,
  initialMessages,
}: ConversationViewProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [input, setInput] = useState("");

  const { messages, status, sendMessage } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as "user" | "assistant",
      parts: [{ type: "text", text: m.content }],
    })),
    onFinish: () => {
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

  const handleEditSubmit = async (messageId: string, newContent: string) => {
    try {
      const dbMsg = initialMessages.find((im) => im.id === messageId);
      const parentId = dbMsg?.parentId || undefined;

      const branch = await createBranch({
        conversationId,
        name: `Branch: ${newContent.slice(0, 25)}...`,
        branchPointMessageId: messageId,
      });

      router.push(`/chatgpt-clone/c/${branch.id}?prompt=${encodeURIComponent(newContent)}&parentId=${parentId || ""}`);
    } catch (err) {
      console.error("Failed to create branch thread:", err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");
    const parentId = params.get("parentId");
    if (prompt) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      sendMessage({ text: prompt }, { body: { parentId: parentId || undefined } });
    }
  }, [conversationId, sendMessage]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d] text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4 shrink-0 relative">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]" />
          <div className="h-4 w-px bg-white/[0.08]" />
          <span className="text-xs font-medium text-muted-foreground truncate animate-fade-in">
            Active Session
          </span>
        </div>

        {/* Global progress indicator at top header */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 animate-pulse" />
        )}
      </header>

      {messages.length === 0 ? (
        <ChatEmpty />
      ) : (
        <StickToBottom>
          {messages.map((m, idx) => {
            const dbMsg = initialMessages.find((im) => im.id === m.id);
            const siblings = dbMsg?.siblings || [];
            const isLastMessage = idx === messages.length - 1;

            return (
              <React.Fragment key={m.id || idx}>
                {m.parts.map((part, pIdx) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <MessageItem
                        key={`${m.id}-text-${pIdx}`}
                        id={m.id}
                        conversationId={conversationId}
                        role={
                          m.role === "user"
                            ? MessageRole.USER
                            : MessageRole.ASSISTANT
                        }
                        content={part.text}
                        isStreaming={isLastMessage && status === "streaming"}
                        siblings={siblings}
                        onEditSubmit={handleEditSubmit}
                      />
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const toolName = part.type.slice(5);
                    const toolPart = part as any;
                    const toolInvocation = {
                      toolName,
                      args: toolPart.input || {},
                      state: (toolPart.state === "output-available" || toolPart.state === "output-error"
                        ? "result"
                        : "call") as "call" | "result" | "partial-call",
                      result: toolPart.state === "output-available"
                        ? toolPart.output
                        : toolPart.state === "output-error"
                        ? { error: toolPart.errorText }
                        : undefined,
                    };

                    return (
                      <ToolInvocationCard
                        key={`${m.id}-tool-${pIdx}`}
                        toolInvocation={toolInvocation}
                      />
                    );
                  }
                  return null;
                })}
              </React.Fragment>
            );
          })}
          {isWaiting && (
            <div className="flex items-start gap-4 py-4 text-sm animate-fade-in">
              <div className="max-w-2xl px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-foreground rounded-bl-none flex items-center gap-3">
                <Loader />
                <span className="text-xs text-muted-foreground animate-pulse font-medium">
                  ChaiGPT is preparing response...
                </span>
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
