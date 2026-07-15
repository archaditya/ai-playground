"use client";

import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatComposerProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ChatComposer({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent"
    >
      <div className="max-w-3xl mx-auto relative flex items-end bg-white/[0.03] border border-white/[0.08] focus-within:border-primary/40 rounded-2xl p-2 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message ChaiGPT..."
          className="flex-1 max-h-48 resize-none bg-transparent border-0 focus:ring-0 text-sm text-foreground placeholder-muted-foreground/60 py-2 px-3 focus-visible:outline-none"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          size="icon"
          className="h-8 w-8 rounded-xl shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
