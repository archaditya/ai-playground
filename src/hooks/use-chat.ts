"use client";

import { useCallback, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { ChatMessage } from "@/types";
import { errorMessage } from "@/lib/utils";

interface UseChatOptions {
  /** API route this experiment posts to, e.g. "/api/persona" */
  apiPath: string;
  /** Extra fields merged into the request body alongside { messages }. Re-read on every send. */
  getExtraBody?: () => Record<string, unknown>;
  /** Called with the full parsed JSON response so pages can read extra fields (e.g. multi-llm candidates). */
  onResponse?: (data: any) => void;
}

/**
 * Generic chat state/orchestration hook shared by every assignment page.
 * Handles sending, loading state, error state, and history — so each new
 * experiment page only needs to render UI, not re-implement fetch logic.
 */
export function useChat({ apiPath, getExtraBody, onResponse }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      const userMessage: ChatMessage = {
        id: nanoid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setError(null);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(apiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            ...(getExtraBody ? getExtraBody() : {}),
          }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? `Request failed with status ${res.status}`);
        }

        onResponse?.(data);

        const assistantMessage: ChatMessage = {
          id: nanoid(),
          role: "assistant",
          content: data.reply ?? data.finalAnswer ?? "",
          createdAt: Date.now(),
          meta: data.meta,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [apiPath, getExtraBody, input, loading, messages, onResponse]
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setLoading(false);
    setInput("");
  }, []);

  return { messages, input, setInput, loading, error, send, clear, setMessages };
}
