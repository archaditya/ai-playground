"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdf-extract";

export default function PdfChatPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [pendingText, setPendingText] = useState<string | undefined>(undefined);
  const [chunksUsed, setChunksUsed] = useState(0);

  const getExtraBody = useCallback(
    () => ({ documentText: pendingText, fileName: fileName ?? undefined }),
    [pendingText, fileName]
  );

  const onResponse = useCallback((data: any) => {
    if (typeof data?.meta?.chunksUsed === "number") setChunksUsed(data.meta.chunksUsed);
    setPendingText(undefined);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/pdf-chat",
    getExtraBody,
    onResponse,
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a .pdf file.");
      return;
    }
    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      setPendingText(text);
      setFileName(file.name);
      toast.success(`Extracted ${text.length.toLocaleString()} characters from ${file.name}`);
    } catch (err) {
      toast.error("Couldn't extract text from that PDF.");
    } finally {
      setExtracting(false);
    }
  }

  function handleClear() {
    setFileName(null);
    setChunksUsed(0);
    clear();
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={FileText}
        title="PDF Chat"
        description="Upload a PDF, extract its text client-side, then ask questions grounded in its content."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <ConfigPanel title="Document" description="Upload a PDF to chat with" icon={FileText}>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
          >
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {extracting ? "Extracting..." : "Upload PDF"}
          </Button>

          {fileName && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs truncate">
              📄 {fileName}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Chunks retrieved last query</span>
            <Badge variant="secondary">{chunksUsed}</Badge>
          </div>
        </ConfigPanel>

        <ChatPanel
          title="PDF Chat"
          description="Text extraction runs entirely in your browser via pdfjs-dist"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={handleClear}
          emptyTitle="Upload a PDF, then ask about it"
          emptyHint="Extraction happens once on upload; questions are answered from the indexed text."
        />
      </div>
    </div>
  );
}
