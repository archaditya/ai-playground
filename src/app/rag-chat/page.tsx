"use client";

import { useCallback, useState } from "react";
import { Database, FileUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RagChatPage() {
  const [docText, setDocText] = useState("");
  const [indexedCount, setIndexedCount] = useState(0);
  const [pendingText, setPendingText] = useState<string | undefined>(undefined);

  const getExtraBody = useCallback(
    () => ({ documentText: pendingText }),
    [pendingText]
  );

  const onResponse = useCallback((data: any) => {
    if (typeof data?.meta?.sourcesUsed === "number") {
      setIndexedCount((c) => Math.max(c, data.meta.sourcesUsed));
    }
    setPendingText(undefined); // only send the doc once
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/rag",
    getExtraBody,
    onResponse,
  });

  function handleIndex() {
    if (!docText.trim()) {
      toast.error("Paste some text to index first.");
      return;
    }
    setPendingText(docText);
    toast.success("Document queued — it will be indexed with your next message.");
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Database}
        title="RAG Chat"
        description="Retrieval-augmented chat over text you paste in — embedded, chunked, and retrieved per question."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <ConfigPanel title="Knowledge source" description="Paste text to index" icon={FileUp}>
          <div className="space-y-2">
            <Label>Document text</Label>
            <Textarea
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder="Paste an article, notes, or docs here..."
              rows={10}
            />
            <Button size="sm" variant="outline" className="w-full" onClick={handleIndex}>
              Queue for indexing
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Chunks retrieved last query</span>
            <Badge variant="secondary">{indexedCount}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Uses an in-memory vector store by default (see <code className="text-foreground/70">lib/vector-store.ts</code>).
            Swap in Pinecone/Supabase for persistence across restarts.
          </p>
        </ConfigPanel>

        <ChatPanel
          title="RAG Chat"
          description="Answers are grounded in your indexed text only"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Index a document, then ask about it"
          emptyHint="Paste text on the left, queue it, then ask a question here."
        />
      </div>
    </div>
  );
}
