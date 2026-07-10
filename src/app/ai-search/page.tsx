"use client";

import { useCallback, useState } from "react";
import { Search, Link2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";

interface Source {
  title: string;
  snippet: string;
  url: string;
}

export default function AiSearchPage() {
  const [sources, setSources] = useState<Source[]>([]);

  const onResponse = useCallback((data: any) => {
    setSources(data?.meta?.sources ?? []);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/ai-search",
    onResponse,
  });

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Search}
        title="AI Search"
        description="Search-augmented answer synthesis — wire in a real search API to go live."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <ConfigPanel title="Sources used" description="From the last query" icon={Link2}>
          {sources.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No sources yet. Ask a question to see retrieved sources appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:border-white/20 transition-colors"
                >
                  <p className="text-xs font-medium">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.snippet}</p>
                </a>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed pt-2">
            Implement <code className="text-foreground/70">fetchSearchResults()</code> in{" "}
            <code className="text-foreground/70">api/ai-search/route.ts</code> with Tavily, Serper, or Exa to go live.
          </p>
        </ConfigPanel>

        <ChatPanel
          title="AI Search"
          description="Currently running on placeholder search results"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Ask a question that needs current information"
          emptyHint="Once a search provider is wired up, answers will cite live sources."
        />
      </div>
    </div>
  );
}
