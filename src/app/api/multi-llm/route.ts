import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openaiChat, OPENAI_MODELS } from "@/lib/openai";
import { anthropicChat, ANTHROPIC_MODELS } from "@/lib/anthropic";
import { thirdLLMChat, thirdLLMConfigured, THIRD_LLM_MODEL } from "@/lib/third-llm";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

/**
 * Multi-LLM Voting — the multi-agent orchestration project.
 *
 * Flow: user query → 3 models answer in parallel (OpenAI, Anthropic, and a
 * third OpenAI-compatible model or a second OpenAI model as fallback) →
 * a matcher model evaluates all candidates and returns the single best
 * final answer.
 */
export const POST = withApiHandler("multi-llm", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const userQuestion = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  // 1. Fan out to 3 models in parallel. Individual failures degrade gracefully
  //    (that model is simply excluded from voting) rather than failing the whole request.
  const candidateJobs: { model: string; job: Promise<string> }[] = [
    {
      model: OPENAI_MODELS.fast,
      job: openaiChat({ messages: [{ role: "system", content: SYSTEM_PROMPTS.base }, ...history] }),
    },
    {
      model: ANTHROPIC_MODELS.fast,
      job: anthropicChat({ system: SYSTEM_PROMPTS.base, messages: history }),
    },
    thirdLLMConfigured
      ? {
          model: THIRD_LLM_MODEL,
          job: thirdLLMChat({ messages: [{ role: "system", content: SYSTEM_PROMPTS.base }, ...history] }),
        }
      : {
          model: OPENAI_MODELS.smart,
          job: openaiChat({
            messages: [{ role: "system", content: SYSTEM_PROMPTS.base }, ...history],
            model: OPENAI_MODELS.smart,
            temperature: 0.4,
          }),
        },
  ];

  const settled = await Promise.allSettled(candidateJobs.map((c) => c.job));
  const candidates = settled
    .map((result, idx) => ({
      model: candidateJobs[idx].model,
      response: result.status === "fulfilled" ? result.value : null,
    }))
    .filter((c): c is { model: string; response: string } => {
      if (c.response === null) {
        logger.warn("Candidate model failed in multi-llm route", { model: c.model });
        return false;
      }
      return true;
    });

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "All candidate models failed to respond. Check your API keys." },
      { status: 502 }
    );
  }

  // 2. Matcher model arbitrates between candidates and returns the final answer.
  const matcherModel = OPENAI_MODELS.smart;
  const matcherPrompt = [
    `Original question:\n${userQuestion}`,
    ``,
    `Candidate answers:`,
    ...candidates.map((c, i) => `--- Candidate ${i + 1} (${c.model}) ---\n${c.response}`),
  ].join("\n");

  const finalAnswer = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.matcher },
      { role: "user", content: matcherPrompt },
    ],
    model: matcherModel,
    temperature: 0.2,
  });

  return NextResponse.json({
    reply: finalAnswer,
    finalAnswer,
    candidates,
    matcherModel,
  });
});
