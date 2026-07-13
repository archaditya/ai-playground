import { auth } from "@clerk/nextjs/server";
import { onBoard } from "@/features/auth/action/onboard";
import React from "react";

export default async function ChatGPTCloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all ChatGPT subroutes using Clerk
  await auth.protect();

  // Run the onboard server action to sync Clerk profile parameters to the DB
  await onBoard();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {children}
    </div>
  );
}
