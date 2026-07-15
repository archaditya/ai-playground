"use server";

import { prisma } from "@/lib/db";
import { MessageRole, MessageStatus } from "@/lib/generated/prisma";

export interface UIMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export async function loadChatMessages(conversationId: string): Promise<UIMessage[]> {
  const dbMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return dbMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  }));
}
