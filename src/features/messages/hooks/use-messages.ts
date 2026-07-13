"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { listMessages } from "../actions/message-actions";

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.messages.byConversation(conversationId),
    queryFn: () => listMessages(conversationId),
    enabled: !!conversationId,
  });
}
