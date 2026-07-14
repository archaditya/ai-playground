"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assertOwnsConversation(conversationId: string) {
  const user = await requireCurrentUser();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.userId !== user.id) {
    throw new Error("Forbidden: You do not own this conversation");
  }

  return { user, conversation };
}

export async function listConversations() {
  const user = await requireCurrentUser();

  return prisma.conversation.findMany({
    where: {
      userId: user.id,
      isArchived: false,
    },
    orderBy: [
      { isPinned: "desc" },
      { lastMessageAt: "desc" },
    ],
  });
}

export async function getConversation(conversationId: string) {
  await assertOwnsConversation(conversationId);

  return prisma.conversation.findUnique({
    where: { id: conversationId },
  });
}

export async function createConversation(params?: {
  title?: string;
  model?: string;
  systemPrompt?: string;
}) {
  const user = await requireCurrentUser();

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: params?.title ?? "New Chat",
      model: params?.model,
      systemPrompt: params?.systemPrompt,
    },
  });

  revalidatePath("/chatgpt-clone");
  return conversation;
}

export async function updateConversation(
  conversationId: string,
  data: {
    title?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    model?: string;
    systemPrompt?: string;
  }
) {
  await assertOwnsConversation(conversationId);

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/chatgpt-clone");
  return conversation;
}

export async function deleteConversation(conversationId: string) {
  await assertOwnsConversation(conversationId);

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  revalidatePath("/chatgpt-clone");
  return { success: true };
}
