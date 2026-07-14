"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function updateProfile(data: {
  firstName: string;
  lastName?: string;
}) {
  const user = await requireCurrentUser();

  if (!data.firstName?.trim()) {
    throw new Error("First name is required");
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName?.trim() || null,
      isOnboarded: true,
    },
  });
}
