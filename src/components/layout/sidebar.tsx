"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
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
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { EXPERIMENTS } from "@/lib/experiments";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
  MessageSquare,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || "User";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden lg:flex h-screen w-72 flex-col shrink-0 border-r border-white/[0.06] glass sticky top-0">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-400 shadow-lg shadow-violet-500/30">
          <Sparkles className="h-4.5 w-4.5 text-white" size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">AI Engineering</p>
          <p className="text-xs text-muted-foreground leading-tight">Playground</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <SidebarLink href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} />

        <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Assignments
        </p>

        {EXPERIMENTS.map((exp) => {
          const Icon = ICONS[exp.icon] ?? Sparkles;
          const href = `/${exp.slug}`;
          return (
            <SidebarLink
              key={exp.slug}
              href={href}
              label={exp.title}
              icon={Icon}
              active={pathname.startsWith(href)}
            />
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.06]">
        {isAuthenticated && user ? (
          <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-sky-400/20 border border-white/10 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="glass-panel px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground/90 mb-0.5">GenAI Cohort Build</p>
            <p>Every assignment is one page + one API route.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/15 text-primary font-medium"
          : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
