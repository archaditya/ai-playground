"use client";

import { useCallback, useState } from "react";
import { Wrench, Calculator, CloudSun, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";

export default function ToolCallingPage() {
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);

  const onResponse = useCallback((data: any) => {
    setToolsUsed(data?.meta?.toolsUsed ?? []);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/tools",
    onResponse,
  });

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Wrench}
        title="Tool Calling"
        description="The model decides when to call a function — weather, calculator, or knowledge base search."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <ConfigPanel title="Available tools" description="Defined in lib/tools.ts" icon={Wrench}>
          <ToolRow icon={CloudSun} name="get_weather" desc="Mock weather lookup by city" />
          <ToolRow icon={Calculator} name="calculate" desc="Safe arithmetic expression evaluator" />
          {/* <ToolRow icon={BookOpen} name="search_knowledge_base" desc="Mock local KB search" /> */}

          {toolsUsed.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Used last turn
              </p>
              <div className="flex flex-wrap gap-1.5">
                {toolsUsed.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </ConfigPanel>

        <ChatPanel
          title="Tool Calling"
          description="Try: “What's the weather in Tokyo?” or “What is (45 * 3) - 12?”"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Ask something a tool could help with"
          emptyHint="The model will call a tool only when it decides one is actually needed."
        />
      </div>
    </div>
  );
}

function ToolRow({ icon: Icon, name, desc }: { icon: any; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-mono">{name}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
