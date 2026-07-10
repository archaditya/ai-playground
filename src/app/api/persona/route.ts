import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/api-helpers";
import { openaiChat } from "@/lib/openai";
import { PERSONAS, type PersonaKey } from "@/lib/prompts";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      })
    )
    .min(1),
  persona: z.string(),
});

/**
 * Persona Chat — same persona-switching bot as the standalone project,
 * now running on the shared playground architecture. Add a new persona by
 * editing `PERSONAS` in src/lib/prompts.ts; no route changes needed.
 */
export const POST = withApiHandler("persona", async (req) => {
  const body = requestSchema.parse(await req.json());

  const persona = PERSONAS[body.persona as PersonaKey];
  if (!persona) {
    throw new ApiError(`Unknown persona "${body.persona}".`, 400);
  }

  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];

  const reply = await openaiChat({
    messages: [{ role: "system", content: persona.systemPrompt }, ...history],
    temperature: 0.8,
  });

  return NextResponse.json({ reply, meta: { persona: body.persona } });
});
