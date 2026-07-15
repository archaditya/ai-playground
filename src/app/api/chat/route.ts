import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MessageRole, MessageStatus } from "@/lib/generated/prisma";
import { streamText, generateId, toUIMessageStream, createUIMessageStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai";

export const dynamic = "force-dynamic";

const getMessageText = (msg: any): string => {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("");
  }
  return "";
};

export async function POST(req: Request) {
  try {
    // 1. Authorize session
    const user = await requireCurrentUser();
    const { messages, id: conversationId } = await req.json();

    if (!messages || !conversationId) {
      return new Response("Missing parameters", { status: 400 });
    }

    // 2. Validate Ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
    });

    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }

    const lastUserMsg = messages[messages.length - 1];
    const lastUserContent = getMessageText(lastUserMsg);

    // 3. Save User Message
    await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content: lastUserContent,
        status: MessageStatus.COMPLETE,
        parts: {},
      },
    });

    // 4. Update conversation activity metrics
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // 5. Autogenerate Title if the chat is still named "New Chat"
    if (conversation.title === "New Chat") {
      const generatedTitle =
        lastUserContent.trim().slice(0, 30) +
        (lastUserContent.length > 30 ? "..." : "");
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: generatedTitle },
      });
    }

    // 6. Request stream text from Vercel AI SDK
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: messages.map((m: any) => ({
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        content: getMessageText(m),
      })),
    });

    // 7. Use stateless AI SDK 7 helpers to create the stream response
    const uiStream = toUIMessageStream({
      stream: result.stream,
      generateMessageId: () => generateId(),
      originalMessages: messages,
      onFinish: async ({ responseMessage }) => {
        try {
          const assistantContent = responseMessage.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => (p.type === "text" ? p.text : ""))
            .join("");

          await prisma.message.create({
            data: {
              conversationId,
              role: MessageRole.ASSISTANT,
              content: assistantContent,
              status: MessageStatus.COMPLETE,
              parts: {},
            },
          });
        } catch (err) {
          console.error("Failed to save assistant response to DB:", err);
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: uiStream,
    });
  } catch (err: any) {
    console.error("Chat api route error:", err);
    return new Response(err.message || "Internal Server Error", { status: 500 });
  }
}
