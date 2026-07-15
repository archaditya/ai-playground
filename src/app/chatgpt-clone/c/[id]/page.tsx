import { notFound } from "next/navigation";
import { assertOwnsConversation } from "@/features/conversation/actions/conversation-actions";
import { loadChatMessages } from "@/features/ai/actions/chat-store";
import { ConversationView } from "@/features/messages/components/conversation-view";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatConversationPage({ params }: ChatPageProps) {
  const { id } = await params;

  try {
    // Assert ownership guard
    await assertOwnsConversation(id);
  } catch (error) {
    console.error("Ownership check failed:", error);
    notFound();
  }

  // Fetch messages from DB
  const initialMessages = await loadChatMessages(id);

  return (
    <ConversationView
      key={id} // Remounts state cleanly when switching threads
      conversationId={id}
      initialMessages={initialMessages}
    />
  );
}
