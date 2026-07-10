"use client";

import { useCallback, useState } from "react";
import { Workflow } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";

interface StepOutput {
  step: string;
  goal: string;
  output: string;
}

export default function WorkflowAgentPage() {
  const [steps, setSteps] = useState<StepOutput[]>([]);

  const onResponse = useCallback((data: any) => {
    setSteps(data?.meta?.steps ?? []);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/workflow",
    onResponse,
  });

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Workflow}
        title="Workflow Agent"
        description="Plans a task into ordered steps, executes each sequentially, then synthesizes the final answer."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <ConfigPanel title="Execution plan" description="Steps from the last run" icon={Workflow}>
          {steps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Submit a multi-part task (e.g. "research X, compare it to Y, then recommend one") to see steps appear.
            </p>
          ) : (
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-xs font-medium">{s.step}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-7">{s.goal}</p>
                  <p className="text-xs text-muted-foreground pl-7 line-clamp-3">{s.output}</p>
                </div>
              ))}
            </div>
          )}
        </ConfigPanel>

        <ChatPanel
          title="Workflow Agent"
          description="Best with tasks that naturally break into sub-steps"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Give it a multi-step task"
          emptyHint="e.g. 'Plan a 3-day itinerary for Goa and estimate the budget'"
        />
      </div>
    </div>
  );
}
