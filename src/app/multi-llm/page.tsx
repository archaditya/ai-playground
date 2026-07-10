"use client";

import { useCallback, useState } from "react";
import { Vote, Sparkles, AlertCircle } from "lucide-react";
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
        description="Your query fans out to 3 thinking models; gpt-4o arbitrates the best final answer."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <ConfigPanel
          title="Orchestration"
          description="How this pipeline works"
          icon={Vote}
        >
          <div className="space-y-3 text-sm">
            <Step n={1} label="Query sent in parallel" detail="o3-mini, Gemini, and o1-mini answer independently" />
            <Step n={2} label="Matcher evaluates" detail="gpt-4o compares all candidates for correctness & clarity" />
            <Step n={3} label="Final answer returned" detail="The best (or synthesized) response is shown in chat" />
          </div>

          <Separator />

          {lastResult ? (
            <div className="space-y-4">
              {/* Highlighted Final Validator Response */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5 animate-pulse-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Validator Output
                  </span>
                  <Badge variant="secondary" className="font-mono text-[9px]">
                    {lastResult.matcherModel}
                  </Badge>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {lastResult.finalAnswer}
                </p>
              </div>

              <Separator />

              {/* Candidate Responses */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidate Responses (Thinking Models)
                </p>
                {lastResult.candidates.map((c, i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {c.model}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 overflow-y-auto max-h-[120px] whitespace-pre-wrap">
                      {c.response}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <AlertCircle className="h-5 w-5 mb-2 opacity-50" />
              <p className="text-xs">
                Validator and candidate responses will appear here.
              </p>
            </div>
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
