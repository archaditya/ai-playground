"use server";

import { prisma } from "@/lib/db";
import { assertOwnsConversation } from "@/features/conversation/actions/conversation-actions";
import { MessageRole, MessageStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

export async function listMessages(conversationId: string) {
  await assertOwnsConversation(conversationId);

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createMessage(params: {
  conversationId: string;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  parts?: any;
  metadata?: any;
  parentId?: string;
}) {
  const { conversation } = await assertOwnsConversation(params.conversationId);

  const parts = params.parts ?? {};

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      status: params.status ?? MessageStatus.COMPLETE,
      parts,
      metadata: params.metadata,
      parentId: params.parentId,
    },
  });

  const now = new Date();
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { lastMessageAt: now },
  });


  if (conversation.title === "New Chat" && params.role === MessageRole.USER) {
    const totalMessages = await prisma.message.count({
      where: { conversationId: params.conversationId },
    });

    if (totalMessages === 1) {
      const generatedTitle =
        params.content.trim().slice(0, 30) +
        (params.content.length > 30 ? "..." : "");
      
      await prisma.conversation.update({
        where: { id: params.conversationId },
        data: { title: generatedTitle },
      });
    }
  }

  revalidatePath("/chatgpt-clone");
  return message;
}

export async function updateMessage(
  messageId: string,
  params: {
    content?: string;
    status?: MessageStatus;
    parts?: any;
    metadata?: any;
  }
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  await assertOwnsConversation(message.conversationId);

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      ...params,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/chatgpt-clone");
  return updatedMessage;
}

export async function deleteMessage(messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  await assertOwnsConversation(message.conversationId);

  await prisma.message.delete({
    where: { id: messageId },
  });

  revalidatePath("/chatgpt-clone");
  return { success: true };
}
