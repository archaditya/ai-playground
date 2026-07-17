"use client";

import React from "react";
import { Globe, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    state: "call" | "result" | "partial-call";
    result?: any;
  };
}

export function ToolInvocationCard({ toolInvocation }: ToolInvocationProps) {
  const { toolName, args, state, result } = toolInvocation;
  const isLoading = state === "call" || state === "partial-call";
  const isDone = state === "result";

  if (toolName !== "web_search") return null;

  return (
    <div className="flex w-full gap-4 py-2 justify-start animate-fade-in">
      <div className="max-w-2xl w-full">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            <Globe className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">
              {isLoading ? "Searching the web..." : "Web search complete"}
            </span>
          </div>

          {/* Query */}
          <div className="px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Query: <span className="text-foreground font-medium">{args.query}</span>
            </p>
          </div>

          {/* Results */}
          {isDone && result?.results?.length > 0 && (
            <div className="px-4 pb-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {result.results.length} results found
              </p>
              {result.results.slice(0, 3).map((r: any, i: number) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group"
                >
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-blue-400 truncate group-hover:underline">
                      {r.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {r.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {isDone && result?.error && (
            <div className="px-4 pb-3">
              <p className="text-xs text-red-400">{result.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
