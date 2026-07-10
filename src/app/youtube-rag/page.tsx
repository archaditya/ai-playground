"use client";

import { useCallback, useState } from "react";
import { Youtube } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function YoutubeRagPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [pendingTranscript, setPendingTranscript] = useState<string | undefined>(undefined);
  const [segmentsUsed, setSegmentsUsed] = useState(0);

  const getExtraBody = useCallback(
    () => ({ transcriptText: pendingTranscript, videoUrl: videoUrl || undefined }),
    [pendingTranscript, videoUrl]
  );

  const onResponse = useCallback((data: any) => {
    if (typeof data?.meta?.segmentsUsed === "number") setSegmentsUsed(data.meta.segmentsUsed);
    setPendingTranscript(undefined);
  }, []);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/youtube-rag",
    getExtraBody,
    onResponse,
  });

  function handleIndex() {
    if (!transcript.trim()) {
      toast.error("Paste the transcript text first.");
      return;
    }
    setPendingTranscript(transcript);
    toast.success("Transcript queued for indexing on your next message.");
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Youtube}
        title="YouTube RAG"
        description="Chat over a video's transcript — paste the transcript, then ask away."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <ConfigPanel title="Video source" description="Paste a URL + transcript" icon={Youtube}>
          <div className="space-y-2">
            <Label>Video URL (optional, for reference)</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="space-y-2">
            <Label>Transcript text</Label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste transcript from YouTube's 'Show transcript' feature..."
              rows={8}
            />
            <Button size="sm" variant="outline" className="w-full" onClick={handleIndex}>
              Queue for indexing
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Segments retrieved last query</span>
            <Badge variant="secondary">{segmentsUsed}</Badge>
          </div>
        </ConfigPanel>

        <ChatPanel
          title="YouTube RAG"
          description="Answers grounded strictly in the indexed transcript"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle="Index a transcript, then ask about the video"
          emptyHint="Paste the transcript on the left and queue it before your first question."
        />
      </div>
    </div>
  );
}
