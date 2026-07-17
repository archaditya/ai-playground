import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MessageRole, MessageStatus } from "@/lib/generated/prisma";
import { streamText, generateId, toUIMessageStream, createUIMessageStreamResponse, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import { webSearchTool } from "@/lib/tools";

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
    const user = await requireCurrentUser();
    const { messages, id: conversationId, parentId } = await req.json();

    if (!messages || !conversationId) {
      return new Response("Missing parameters", { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
    });

    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }

    const lastUserMsg = messages[messages.length - 1];
    const lastUserContent = getMessageText(lastUserMsg);

    // Auto-resolve parentId from last message in DB if not provided
    const lastMsgInDb = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
    });

    // Save User Message
    const userMsg = await prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content: lastUserContent,
        status: MessageStatus.COMPLETE,
        parts: {},
        parentId: parentId || lastMsgInDb?.id || null,
      },
    });

    // Update conversation activity metrics
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Autogenerate Title
    if (conversation.title === "New Chat") {
      const generatedTitle =
        lastUserContent.trim().slice(0, 30) +
        (lastUserContent.length > 30 ? "..." : "");
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title: generatedTitle },
      });
    }

    // Stream with tools
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: "You are ChaiGPT, a helpful AI assistant. When the user asks about current events, recent news, live data, stock prices, weather, or anything you may not have up-to-date knowledge about, use the web_search tool to find real-time information. Always cite your sources with URLs when using search results.",
      messages: messages.map((m: any) => ({
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        content: getMessageText(m),
      })),
      tools: {
        web_search: webSearchTool,
      },
      stopWhen: isStepCount(5),
    });

    const uiStream = toUIMessageStream({
      stream: result.stream,
      generateMessageId: () => generateId(),
      originalMessages: messages,
      onFinish: async ({ responseMessage }) => {
        try {
          // Extract text content
          const assistantContent = responseMessage.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => (p.type === "text" ? p.text : ""))
            .join("");

          // Extract tool call info for metadata
          const toolInvocations = responseMessage.parts
            .filter((p: any) => typeof p.type === "string" && p.type.startsWith("tool-"))
            .map((p: any) => ({
              toolName: p.type.slice(5),
              args: p.input,
              result: p.output,
            }));

          await prisma.message.create({
            data: {
              conversationId,
              role: MessageRole.ASSISTANT,
              content: assistantContent,
              status: MessageStatus.COMPLETE,
              parts: JSON.parse(JSON.stringify(responseMessage.parts)),
              metadata: toolInvocations.length > 0
                ? { toolCalls: toolInvocations }
                : undefined,
              parentId: userMsg.id,
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
