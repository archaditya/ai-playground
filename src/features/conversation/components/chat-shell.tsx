"use client";

import React from "react";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#0d0d0d] overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-[#0d0d0d]">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
