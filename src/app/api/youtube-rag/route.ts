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
  /** Paste the transcript text directly (simplest path for a weekend demo). */
  transcriptText: z.string().optional(),
  videoUrl: z.string().url().optional(),
});

/**
 * YouTube RAG — same RAG pattern as /api/rag, scoped to a video transcript.
 *
 * For a weekend build, the simplest reliable path is to have the user paste
 * the transcript (YouTube's own "Show transcript" feature, or a tool like
 * youtube-transcript-api run separately) rather than depending on a
 * same-origin fetch of YouTube's private endpoints from the server.
 * `videoUrl` is accepted for display/reference purposes.
 */
export const POST = withApiHandler("youtube-rag", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  if (body.transcriptText && body.transcriptText.trim().length > 0) {
    const chunks = chunkText(body.transcriptText);
    await vectorStore.upsert(chunks.map((c) => ({ id: nanoid(), text: c, metadata: { source: "youtube" } })));
  }

  const matches = await vectorStore.query(question, 5);
  if (matches.length === 0) {
    throw new ApiError("No transcript indexed yet. Paste a transcript first.", 400);
  }

  const context = matches.map((m, i) => `[Segment ${i + 1}] ${m.text}`).join("\n\n");

  const reply = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.rag },
      { role: "user", content: `Video transcript segments:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.3,
  });

  return NextResponse.json({ reply, meta: { segmentsUsed: matches.length, videoUrl: body.videoUrl } });
});
