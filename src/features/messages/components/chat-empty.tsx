import React from "react";
import { Sparkles } from "lucide-react";

export function ChatEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-sky-400 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-white mb-1.5">
        How can I help you today?
      </h2>
      <p className="text-xs text-muted-foreground max-w-xs">
        Ask anything, write code, solve math equations, or structure documentation.
      </p>
    </div>
  );
}
