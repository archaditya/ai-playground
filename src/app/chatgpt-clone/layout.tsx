import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import React from "react";
import { ChatShell } from "@/features/conversation/components/chat-shell";

export default async function ChatGPTCloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?redirect=/chatgpt-clone");
  }

  if (!user.isOnboarded) {
    redirect("/onboard");
  }

  return (
    <ChatShell>
      {children}
    </ChatShell>
  );
}
