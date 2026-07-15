import { startNewChat } from "@/features/home/actions/start-new-chat";
import { redirect } from "next/navigation";

export default async function ChatGPTClonePage() {
  const chat = await startNewChat();
  redirect(`/chatgpt-clone/c/${chat.id}`);
}
