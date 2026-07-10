import Link from "next/link";
import {
  Drama,
  Vote,
  Database,
  Wrench,
  BrainCircuit,
  Plug,
  Workflow,
  Youtube,
  FileText,
  Search,
  ArrowUpRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { EXPERIMENTS } from "@/lib/experiments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, LucideIcon> = {
  Drama,
  Vote,
  Database,
  Wrench,
  BrainCircuit,
  Plug,
  Workflow,
  Youtube,
  FileText,
  Search,
};

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-10 lg:px-10 lg:py-14 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          GenAI Cohort
        </span>
      </div>
      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
        AI Engineering Playground
      </h1>
      <p className="text-muted-foreground max-w-2xl mb-10">
        One dashboard, one page per assignment. Pick an experiment below — each ships with its
        own configuration panel, chat interface, and dedicated API route, so building the next
        one never means rewriting the last one.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPERIMENTS.map((exp) => {
          const Icon = ICONS[exp.icon] ?? Sparkles;
          return (
            <Link key={exp.slug} href={`/${exp.slug}`} className="group">
              <Card className="glass-hover h-full transition-transform duration-200 group-hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="pt-2">{exp.title}</CardTitle>
                  <CardDescription>{exp.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {exp.apiPath}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 glass-panel p-6">
        <h2 className="text-sm font-semibold mb-2">Adding a new assignment</h2>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Add one entry to <code className="text-foreground/80">src/lib/experiments.ts</code></li>
          <li>Create <code className="text-foreground/80">src/app/&lt;slug&gt;/page.tsx</code> reusing <code className="text-foreground/80">ChatPanel</code></li>
          <li>Create <code className="text-foreground/80">src/app/api/&lt;slug&gt;/route.ts</code> reusing the LLM + prompt helpers</li>
        </ol>
      </div>
    </div>
  );
}
