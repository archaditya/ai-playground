export const queryKeys = {
  conversations: {
    all: ["conversations"] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
  },
  messages: {
    byConversation: (conversationId: string) => ["messages", "byConversation", conversationId] as const,
  },
} as const;
