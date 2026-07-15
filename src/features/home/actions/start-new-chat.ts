"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function startNewChat() {

  const user = await requireCurrentUser();

  // Find if there is already an empty conversation (0 messages)
  const existingEmptyChat = await prisma.conversation.findFirst({
    where: {
      userId: user.id,
      messages: {
        none: {}, // Returns records with zero relation entries
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingEmptyChat) {
    return existingEmptyChat;
  }

  // Create a new empty conversation
  const newChat = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: "New Chat",
    },
  });
  
  return newChat;
}