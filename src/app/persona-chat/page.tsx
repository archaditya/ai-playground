"use client";

import { useCallback, useState } from "react";
import { Drama } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { PERSONAS, type PersonaKey } from "@/lib/prompts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function PersonaChatPage() {
  const [persona, setPersona] = useState<PersonaKey>("einstein");

  const getExtraBody = useCallback(() => ({ persona }), [persona]);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/persona",
    getExtraBody,
  });

  const active = PERSONAS[persona];

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        icon={Drama}
        title="Persona Chat"
        description="Chat with a switchable AI persona — same personality engine, new voice per selection."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <ConfigPanel title="Persona" description="Pick who you're talking to" icon={Drama}>
          <div className="space-y-2">
            <Label>Active persona</Label>
            <Select value={persona} onValueChange={(v) => setPersona(v as PersonaKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSONAS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground pt-1">{active.description}</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Switching persona mid-conversation is safe — each turn is sent with the current
              persona's system prompt, so history stays intact while tone changes instantly.
            </p>
          </div>
        </ConfigPanel>

        <ChatPanel
          title={`Chatting with ${active.label}`}
          description="Responses are generated live — no persona responses are hard-coded"
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          error={error}
          onSend={send}
          onClear={clear}
          emptyTitle={`Say hello to ${active.label}`}
          emptyHint="Try asking a question and notice how tone and vocabulary shift per persona."
          headerExtra={<Badge variant="secondary">{active.label}</Badge>}
        />
      </div>
    </div>
  );
}
