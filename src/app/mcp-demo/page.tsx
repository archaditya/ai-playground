"use client";

import { useCallback, useState } from "react";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";

interface TraceEntry {
  resource: string;
  input: unknown;
  output: string;
}

export default function McpDemoPage() {
  const [trace, setTrace] = useState<TraceEntry[]>([]);

  const onResponse = useCallback((data: any) => {
    setTrace(data?.meta?.trace ?? []);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/mcp",
    onResponse,
  });

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Plug}
        title="MCP Demo"
        description="Educational simulation of Model Context Protocol-style resource access and tracing."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <ConfigPanel title="Resource access trace" description="What the model accessed last turn" icon={Plug}>
          {trace.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No resources accessed yet. Ask something that needs a tool/resource lookup.
            </p>
          ) : (
            <div className="space-y-3">
              {trace.map((t, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
                  <Badge className="font-mono text-[10px]">{t.resource}</Badge>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground/70">input:</span> {JSON.stringify(t.input)}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    <span className="text-foreground/70">output:</span> {t.output}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ConfigPanel>

        <ChatPanel
          title="MCP Demo"
          description="Simplified simulation — swap in @modelcontextprotocol/sdk for real MCP servers"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Ask something that needs a resource lookup"
          emptyHint="e.g. 'search the knowledge base for vector database'"
        />
      </div>
    </div>
  );
}
