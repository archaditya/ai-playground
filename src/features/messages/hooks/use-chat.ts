"use client";

import { useState } from "react";
import { MessageRole } from "@/lib/generated/prisma";
import { toast } from "sonner";

export interface Message {
  id?: string;
  role: MessageRole;
  content: string;
}

export function useChat({
  conversationId,
  initialMessages = [],
  onFinish,
}: {
  conversationId: string;
  initialMessages?: Message[];
  onFinish?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    const userMsg: Message = { role: MessageRole.USER, content: userMessageContent };
    
    // Optimistically render user message
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conversationId,
          messages: [...messages, userMsg],
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to initialize chunk reader stream.");
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Initialize placeholder assistant bubble
      setMessages((prev) => [...prev, { role: MessageRole.ASSISTANT, content: "" }]);

      // Read chunk streams from server response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        assistantContent += chunkText;

        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: assistantContent,
          };
          return updated;
        });
      }

      if (onFinish) {
        onFinish();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process chat response stream.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}
