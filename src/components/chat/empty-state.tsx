import { Sparkles } from "lucide-react";

export function ChatEmptyState({
  title = "Start the conversation",
  hint = "Type a message below to see the model respond.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 animate-pulse-glow">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{hint}</p>
    </div>
  );
}
