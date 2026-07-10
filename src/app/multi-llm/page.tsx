"use client";

import { useCallback, useState } from "react";
import { Vote, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { MultiLLMResponse } from "@/types";

export default function MultiLLMPage() {
  const [lastResult, setLastResult] = useState<MultiLLMResponse | null>(null);

  const onResponse = useCallback((data: any) => {
    setLastResult({
      candidates: data.candidates ?? [],
      finalAnswer: data.finalAnswer ?? data.reply ?? "",
      matcherModel: data.matcherModel ?? "",
    });
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/multi-llm",
    onResponse,
  });

  function handleClear() {
    setLastResult(null);
    clear();
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Vote}
        title="Multi-LLM Voting"
        description="Your query fans out to 3 models; a matcher model arbitrates the best final answer."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <ConfigPanel
          title="Orchestration"
          description="How this pipeline works"
          icon={Vote}
        >
          <div className="space-y-3 text-sm">
            <Step n={1} label="Query sent in parallel" detail="OpenAI, Anthropic, and a 3rd model each answer independently" />
            <Step n={2} label="Matcher evaluates" detail="A dedicated LLM compares all candidates for correctness & clarity" />
            <Step n={3} label="Final answer returned" detail="The best (or synthesized) response is shown in chat" />
          </div>

          <Separator />

          {lastResult && lastResult.candidates.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Candidate responses
              </p>
              {lastResult.candidates.map((c, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {c.model}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                    {c.response}
                  </p>
                </div>
              ))}
              <div className="flex items-center gap-1.5 pt-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <p className="text-[11px] text-muted-foreground">
                  Arbitrated by <span className="text-foreground/80">{lastResult.matcherModel}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Candidate responses will appear here after your first message.
            </p>
          )}
        </ConfigPanel>

        <ChatPanel
          title="Multi-LLM Voting"
          description="Final, arbitrated answer shown below"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={handleClear}
          emptyTitle="Ask something worth a second (and third) opinion"
          emptyHint="Great for factual or nuanced questions where model disagreement is informative."
        />
      </div>
    </div>
  );
}

function Step({ n, label, detail }: { n: number; label: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
        {n}
      </div>
      <div>
        <p className="font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
