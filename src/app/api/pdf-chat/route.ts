import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/api-helpers";
import { openaiChat } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { vectorStore } from "@/lib/vector-store";
import { chunkText } from "@/lib/embeddings";
import { nanoid } from "nanoid";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
  /** Extracted PDF text, sent once after client-side parsing (see page.tsx). */
  documentText: z.string().optional(),
  fileName: z.string().optional(),
});

/**
 * PDF Chat — same RAG pattern again, scoped to an uploaded PDF's extracted
 * text. Text extraction happens client-side (pdfjs-dist) or via any PDF
 * parser of your choice before hitting this route, keeping this handler
 * focused purely on chunk/embed/retrieve/answer.
 */
export const POST = withApiHandler("pdf-chat", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  if (body.documentText && body.documentText.trim().length > 0) {
    const chunks = chunkText(body.documentText);
    await vectorStore.upsert(
      chunks.map((c) => ({ id: nanoid(), text: c, metadata: { source: body.fileName ?? "pdf" } }))
    );
  }

  const matches = await vectorStore.query(question, 5);
  if (matches.length === 0) {
    throw new ApiError("No document indexed yet. Upload a PDF first.", 400);
  }

  const context = matches.map((m, i) => `[Page-chunk ${i + 1}] ${m.text}`).join("\n\n");

  const reply = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.rag },
      { role: "user", content: `Document excerpts:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.3,
  });

  return NextResponse.json({ reply, meta: { chunksUsed: matches.length, fileName: body.fileName } });
});
