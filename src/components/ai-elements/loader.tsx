import React from "react";

export function Loader() {
  return (
    <div className="flex items-center gap-1 py-2">
      <div className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
    </div>
  );
}
