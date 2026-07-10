"use client";

import { useCallback, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";

export default function MemoryAgentPage() {
  const [memory, setMemory] = useState<string[]>([]);

  const getExtraBody = useCallback(() => ({ memory }), [memory]);

  const onResponse = useCallback((data: any) => {
    if (Array.isArray(data?.memory)) setMemory(data.memory);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/memory",
    getExtraBody,
    onResponse,
  });

  function handleClear() {
    setMemory([]);
    clear();
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={BrainCircuit}
        title="Memory Agent"
        description="Remembers durable facts you share and reuses them for the rest of the session."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <ConfigPanel title="Remembered facts" description="Extracted automatically each turn" icon={BrainCircuit}>
          {memory.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing remembered yet. Share something like "I live in Ahmedabad" and watch this fill in.
            </p>
          ) : (
            <div className="space-y-2">
              {memory.map((fact, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
                  {fact}
                </div>
              ))}
            </div>
          )}
          <Badge variant="outline" className="font-mono text-[10px]">
            {memory.length} fact{memory.length === 1 ? "" : "s"} stored
          </Badge>
        </ConfigPanel>

        <ChatPanel
          title="Memory Agent"
          description="Session memory only — resets on Clear chat"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={handleClear}
          emptyTitle="Tell it something about yourself"
          emptyHint="Then ask a question later that depends on remembering it."
        />
      </div>
    </div>
  );
}
