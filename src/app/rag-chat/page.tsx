"use client";

import { useCallback, useState, useEffect } from "react";
import { Database, FileUp, Loader2, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RagChatPage() {
  const [indexedCount, setIndexedCount] = useState(0);
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [indexingFile, setIndexingFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch list of PDFs in public directory on mount
  const fetchPdfFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/indexing");
      if (res.ok) {
        const data = await res.json();
        setPdfFiles(data.files || []);
      }
    } catch (err) {
      console.error("Failed to fetch PDFs list", err);
    }
  }, []);

  useEffect(() => {
    fetchPdfFiles();
  }, [fetchPdfFiles]);

  // Index an existing PDF already in the public directory
  const handleIndexFile = async (fileName: string) => {
    setIndexingFile(fileName);
    const toastId = toast.loading(`Indexing ${fileName}...`);
    try {
      const res = await fetch("/api/rag/indexing", {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("fileName", fileName);
          return fd;
        })(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `${fileName} indexed successfully!`, { id: toastId });
      } else {
        toast.error(data.error || `Failed to index ${fileName}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Error indexing ${fileName}`, { id: toastId });
    } finally {
      setIndexingFile(null);
    }
  };

  // Upload a new PDF to public/ and then index it in Qdrant
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file only.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`Uploading and indexing ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/rag/indexing", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `${file.name} uploaded and indexed successfully!`, { id: toastId });
        fetchPdfFiles(); // Refresh PDF list
      } else {
        toast.error(data.error || `Failed to upload/index ${file.name}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Error uploading file`, { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = ""; // Clear file input
    }
  };

  const onResponse = useCallback((data: any) => {
    if (typeof data?.meta?.sourcesUsed === "number") {
      setIndexedCount(data.meta.sourcesUsed);
    }
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/rag",
    onResponse,
  });

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Database}
        title="RAG Chat"
        description="Retrieval-augmented chat over your uploaded documents — powered by Qdrant and LangChain."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start mt-6">
        <ConfigPanel
          title="Knowledge Source"
          description="Upload and index PDFs to ground chat answers."
          icon={FileUp}
        >
          <div className="space-y-4">
            {/* File Upload Trigger */}
            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg p-6 cursor-pointer hover:bg-white/[0.04] transition">
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Upload PDF</span>
              <span className="text-xs text-muted-foreground mt-1">Drag & drop or click</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>

            {/* List of PDFs */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available PDFs
              </span>
              {pdfFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">No PDFs uploaded yet.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                  {pdfFiles.map((file) => (
                    <div
                      key={file}
                      className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-white/10"
                    >
                      <a
                        target="_blank"
                        href={`/${file}`}
                        className="text-xs font-medium hover:underline text-primary truncate max-w-[160px]"
                      >
                        {file}
                      </a>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={indexingFile === file}
                        onClick={() => handleIndexFile(file)}
                        className="text-[10px] h-7 px-2"
                      >
                        {indexingFile === file ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Index
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/10 pt-4">
              <span>Chunks retrieved last query</span>
              <Badge variant="secondary">{indexedCount}</Badge>
            </div>
          </div>
        </ConfigPanel>

        <ChatPanel
          title="RAG Chat"
          description="Answers are grounded in indexed text only"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Ask about the documents in the sidebar"
          emptyHint="Upload and Index a PDF on the left, then ask a question here."
        />
      </div>
    </div>
  );
}
