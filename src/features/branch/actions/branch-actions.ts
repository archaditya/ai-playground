"use server";

import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MessageRole } from "@/lib/generated/prisma";

export async function listBranches(conversationId: string) {
  const user = await requireCurrentUser();
  
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
  });
  if (!conversation) return [];

  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: { id: true },
  });
  const messageIds = messages.map(m => m.id);

  if (messageIds.length === 0) return [];

  const branchedMessages = await prisma.message.findMany({
    where: {
      parentId: { in: messageIds },
      conversationId: { not: conversationId },
    },
    include: {
      conversation: true,
    },
  });

  return branchedMessages.map(m => ({
    id: m.conversationId,
    name: m.conversation.title,
    conversationId: m.conversationId,
    parentConversationId: conversationId,
    branchPointMessageId: m.parentId,
    createdAt: m.conversation.createdAt,
  }));
}

export async function createBranch(params: {
  conversationId: string;
  name: string;
  branchPointMessageId: string;
}) {
  const user = await requireCurrentUser();

  const parentConv = await prisma.conversation.findFirst({
    where: { id: params.conversationId, userId: user.id },
  });
  if (!parentConv) throw new Error("Conversation not found");

  // Create the branched conversation container
  const branchConv = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: params.name,
      model: parentConv.model,
      systemPrompt: parentConv.systemPrompt,
    },
  });

  // Find the message where the user wants to fork
  const branchPointMsg = await prisma.message.findFirst({
    where: { id: params.branchPointMessageId },
  });

  // If branching from an Assistant reply, clone that single message to seed the tree
  if (branchPointMsg && branchPointMsg.role === MessageRole.ASSISTANT) {
    await prisma.message.create({
      data: {
        conversationId: branchConv.id,
        role: branchPointMsg.role,
        status: branchPointMsg.status,
        content: branchPointMsg.content,
        parts: branchPointMsg.parts || {},
        metadata: branchPointMsg.metadata || {},
        parentId: branchPointMsg.parentId,
        createdAt: branchPointMsg.createdAt,
      },
    });
  }

  revalidatePath("/chatgpt-clone");
  return branchConv;
}

export async function renameBranch(branchId: string, newName: string) {
  const user = await requireCurrentUser();
  const updated = await prisma.conversation.update({
    where: { id: branchId, userId: user.id },
    data: { title: newName },
  });
  revalidatePath("/chatgpt-clone");
  return updated;
}

export async function deleteBranch(branchId: string) {
  const user = await requireCurrentUser();
  await prisma.conversation.delete({
    where: { id: branchId, userId: user.id },
  });
  revalidatePath("/chatgpt-clone");
  return { success: true };
}

export async function getBranchMessages(branchId: string) {
  const user = await requireCurrentUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id: branchId, userId: user.id },
  });
  if (!conversation) throw new Error("Branch not found");

  return prisma.message.findMany({
    where: { conversationId: branchId },
    orderBy: { createdAt: "asc" },
  });
}

export async function ensureMainBranch(conversationId: string) {
  const user = await requireCurrentUser();
  return prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
  });
}
