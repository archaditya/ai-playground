import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openaiChat } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
  /** Facts remembered so far, sent back by the client each turn (see page.tsx). */
  memory: z.array(z.string()).default([]),
});

/**
 * Memory Agent — a lightweight long-term-memory demo. The client keeps a
 * running `memory[]` array of remembered facts (persisted in component
 * state for this demo). Each turn we ask the model to (a) answer using
 * that memory and (b) extract any new fact worth remembering.
 */
export const POST = withApiHandler("memory", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];

  const memoryBlock = body.memory.length
    ? `Known facts about the user so far:\n${body.memory.map((f) => `- ${f}`).join("\n")}`
    : "No facts remembered yet.";

  const reply = await openaiChat({
    messages: [
      { role: "system", content: `${SYSTEM_PROMPTS.memoryAgent}\n\n${memoryBlock}` },
      ...history,
    ],
    temperature: 0.6,
  });

  // Ask a cheap follow-up to see if a new durable fact should be stored.
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const extraction = await openaiChat({
    messages: [
      {
        role: "system",
        content:
          'Extract at most one short, durable fact about the user from their message (e.g. "User lives in Mumbai"). Reply with ONLY the fact as one short sentence, or reply with exactly "NONE" if there is nothing worth remembering.',
      },
      { role: "user", content: lastUserMessage },
    ],
    temperature: 0,
    maxTokens: 60,
  });

  const newFact = extraction.trim();
  const updatedMemory =
    newFact && newFact.toUpperCase() !== "NONE" ? [...body.memory, newFact] : body.memory;

  return NextResponse.json({ reply, memory: updatedMemory, meta: { newFact: newFact !== "NONE" ? newFact : null } });
});
