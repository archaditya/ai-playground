"use server";

import { prisma } from "@/lib/db";
import { MessageRole } from "@/lib/generated/prisma";

export interface UIMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  parentId?: string | null;
  siblings?: {
    messageId: string;
    conversationId: string;
    conversationTitle: string;
    content: string;
  }[];
}

export async function loadChatMessages(conversationId: string): Promise<UIMessage[]> {
  const getMessagesRecursive = async (convId: string): Promise<any[]> => {
    const localMessages = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
    });

    if (localMessages.length === 0) return [];

    const firstMsg = localMessages[0];
    if (firstMsg.parentId) {
      const parentMsg = await prisma.message.findUnique({
        where: { id: firstMsg.parentId },
      });

      if (parentMsg) {
        const parentMessages = await getMessagesRecursive(parentMsg.conversationId);
        const branchPointIndex = parentMessages.findIndex((m) => m.id === parentMsg.id);
        
        if (branchPointIndex !== -1) {
          return [...parentMessages.slice(0, branchPointIndex + 1), ...localMessages];
        }
      }
    }

    return localMessages;
  };

  const dbMessages = await getMessagesRecursive(conversationId);

  // Find all siblings that share parentIds with returned messages
  const parentIds = dbMessages.map((m) => m.parentId).filter(Boolean) as string[];

  const siblings = parentIds.length > 0
    ? await prisma.message.findMany({
        where: {
          parentId: { in: parentIds },
        },
        include: {
          conversation: true,
        },
      })
    : [];

  return dbMessages.map((m) => {
    const msgSiblings = m.parentId
      ? siblings
          .filter((s) => s.parentId === m.parentId)
          .map((s) => ({
            messageId: s.id,
            conversationId: s.conversationId,
            conversationTitle: s.conversation.title,
            content: s.content,
          }))
      : [];

    return {
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      parentId: m.parentId,
      siblings: msgSiblings,
    };
  });
}
