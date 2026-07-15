"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide the global dashboard sidebar and nav on dedicated layouts
  const hideSidebar =
    pathname.startsWith("/chatgpt-clone") ||
    pathname === "/sign-in" ||
    pathname === "/onboard";

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen w-full bg-[#0d0d0d]">
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
