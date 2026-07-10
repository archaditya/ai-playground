"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { EXPERIMENTS } from "@/lib/experiments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden sticky top-0 z-40 glass border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-400">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">AI Playground</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <nav className="border-t border-white/[0.06] px-3 py-3 max-h-[70vh] overflow-y-auto space-y-1">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm",
              pathname === "/" ? "bg-primary/15 text-primary" : "text-muted-foreground"
            )}
          >
            Dashboard
          </Link>
          {EXPERIMENTS.map((exp) => {
            const href = `/${exp.slug}`;
            return (
              <Link
                key={exp.slug}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm",
                  pathname === href ? "bg-primary/15 text-primary" : "text-muted-foreground"
                )}
              >
                {exp.title}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
