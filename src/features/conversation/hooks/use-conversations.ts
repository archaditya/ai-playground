"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import {
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
} from "../actions/conversation-actions";
import { toast } from "sonner";

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => listConversations(),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (params?: { title?: string; model?: string; systemPrompt?: string }) =>
      createConversation(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      toast.success("Conversation created successfully");
      router.push(`/chatgpt-clone/c/${data.id}`);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || "Failed to create conversation");
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        isPinned?: boolean;
        isArchived?: boolean;
        model?: string;
        systemPrompt?: string;
      };
    }) => updateConversation(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(data.id) });
      toast.success("Conversation updated");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || "Failed to update conversation");
    },
  });
}

export function useDeleteConversation(activeId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: (_, idDeleted) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      toast.success("Conversation deleted");
      if (activeId === idDeleted) {
        router.push("/chatgpt-clone");
      }
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.message || "Failed to delete conversation");
    },
  });
}
