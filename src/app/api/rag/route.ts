import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openaiChat } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { vectorStore } from "@/lib/vector-store";
import { chunkText } from "@/lib/embeddings";
import { nanoid } from "nanoid";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
  /** Raw text to (re)index before answering. Optional — omit on follow-up turns. */
  documentText: z.string().optional(),
});

/**
 * RAG Chat — embeds `documentText` into the shared in-memory vector store,
 * retrieves the top matching chunks for the latest user question, and
 * answers grounded strictly in that context.
 */
export const POST = withApiHandler("rag", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  if (body.documentText && body.documentText.trim().length > 0) {
    const chunks = chunkText(body.documentText);
    await vectorStore.upsert(chunks.map((c) => ({ id: nanoid(), text: c })));
  }

  const matches = await vectorStore.query(question, 4);
  const context = matches.length
    ? matches.map((m, i) => `[Source ${i + 1}] ${m.text}`).join("\n\n")
    : "No indexed documents yet.";

  const reply = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.rag },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.3,
  });

  return NextResponse.json({ reply, meta: { sourcesUsed: matches.length } });
});
