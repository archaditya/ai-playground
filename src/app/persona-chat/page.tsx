"use client";

import { useCallback, useState } from "react";
import { Drama, Coffee, Code } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfigPanel } from "@/components/chat/config-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { PERSONAS, type PersonaKey } from "@/lib/prompts";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PersonaChatPage() {
  const [persona, setPersona] = useState<PersonaKey>("hitesh");

  const getExtraBody = useCallback(() => ({ persona }), [persona]);

  const { messages, input, setInput, loading, error, send, clear } = useChat({
    apiPath: "/api/persona",
    getExtraBody,
  });

  const active = PERSONAS[persona];

  // Helper to validate input character length
  const isInputTooLong = input.length > 5000;

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10 max-w-6xl mx-auto animate-fade-in space-y-8">
      <PageHeader
        icon={Drama}
        title="Persona Chatbot"
        description="Interact with professional programming personas. Observe distinct tones, languages, and philosophies generated dynamically by the agent engine."
      />

      {/* Premium Persona Selection Cards (Hitesh Sir & Piyush Sir) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hitesh Sir Card */}
        <Card
          onClick={() => setPersona("hitesh")}
          className={cn(
            "relative overflow-hidden cursor-pointer border transition-all duration-300 hover:shadow-lg",
            persona === "hitesh"
              ? "border-orange-500/50 bg-gradient-to-br from-orange-500/10 to-transparent shadow-md"
              : "border-white/5 bg-white/[0.02] hover:border-white/10"
          )}
        >
          <CardContent className="p-5 flex gap-4 items-center">
            <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner">
              HC
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Hitesh Choudhary</span>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-none text-[10px]">
                  Chai aur Code
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Calm, patient, beginner-friendly programming mentor. Guides step-by-step with practical advice.
              </p>
            </div>
          </CardContent>
          {persona === "hitesh" && (
            <div className="absolute right-0 top-0 h-2 w-2 rounded-bl-lg bg-orange-500" />
          )}
        </Card>

        {/* Piyush Sir Card */}
        <Card
          onClick={() => setPersona("piyush")}
          className={cn(
            "relative overflow-hidden cursor-pointer border transition-all duration-300 hover:shadow-lg",
            persona === "piyush"
              ? "border-teal-500/50 bg-gradient-to-br from-teal-500/10 to-transparent shadow-md"
              : "border-white/5 bg-white/[0.02] hover:border-white/10"
          )}
        >
          <CardContent className="p-5 flex gap-4 items-center">
            <div className="h-12 w-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner">
              PG
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Piyush Garg</span>
                <Badge variant="secondary" className="bg-teal-500/10 text-teal-400 border-none text-[10px]">
                  piyushgargdev
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Builder mindset. Deep-dives into system internals, distributed architectures, and production issues.
              </p>
            </div>
          </CardContent>
          {persona === "piyush" && (
            <div className="absolute right-0 top-0 h-2 w-2 rounded-bl-lg bg-teal-500" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Sidebar Configuration */}
        <ConfigPanel title="Configure" description="Control agent parameters" icon={Drama}>
          {/* Legacy switchable options (Einstein, Yoda etc) */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Choose Personas</Label>
            <Select value={persona} onValueChange={(v) => setPersona(v as PersonaKey)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select historical persona" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSONAS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed italic">
              {active.description}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Coffee className="h-3.5 w-3.5" />
              <span>Multi-Step Agent Loop</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This agent works via a structured pipeline: <strong>INITIAL → THINK → TOOL_REQUEST → ANALYSE → OUTPUT</strong>.
              It decides autonomously when to call external APIs (wttr.in for weather, Google YouTube search API) and verifies its results step-by-step.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
              <Code className="h-3.5 w-3.5" />
              <span>Security Guardrails Enabled</span>
            </div>
            <ul className="text-[10px] text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Rate limit: 10 requests / min / IP</li>
              <li>Input limit: Max 5000 characters</li>
              <li>Execution limit: 30s timeout</li>
              <li>Spam protection: Parallel disabled</li>
            </ul>
          </div>
        </ConfigPanel>

        {/* Chat Panel */}
        <div className="relative">
          <ChatPanel
            title={`Conversation with ${active.label}`}
            description="Responses are processed in real-time by the reasoning agent."
            messages={messages}
            input={input}
            setInput={setInput}
            loading={loading}
            error={error}
            onSend={() => {
              if (isInputTooLong) return;
              send();
            }}
            onClear={clear}
            emptyTitle={`Ask ${active.label} a question`}
            emptyHint="Ask about programming, system architecture, how tools work, or query the weather of a city to trigger function calling!"
            headerExtra={
              <Badge variant="outline" className={cn("capitalize px-2 py-0.5", active.color, "text-white border-none")}>
                {active.short}
              </Badge>
            }
          />
          
          {/* Character limit feedback */}
          <div className="absolute right-4 bottom-14 flex items-center gap-2 text-xs pointer-events-none">
            <span className={cn(isInputTooLong ? "text-destructive font-semibold" : "text-muted-foreground/60")}>
              {input.length} / 5000
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
