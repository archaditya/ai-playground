import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/api-helpers";
import { openai } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { logger } from "@/lib/logger";
import OpenAI from "openai";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

// Helper 1: OpenAI Call (handles reasoning models o1/o3 safely)
async function callOpenAI(messages: any[], model: string): Promise<string> {
  const isReasoning = model.startsWith("o1-") || model.startsWith("o3-");
  const formattedMessages = messages.map((m) => {
    // o1-mini does not support system role in older API revisions, map system to user
    if (model.startsWith("o1-") && m.role === "system") {
      return { role: "user", content: `Instructions: ${m.content}` };
    }
    return m;
  });

  const completion = await openai.chat.completions.create({
    model,
    messages: formattedMessages,
    ...(isReasoning ? {} : { temperature: 0.7 }),
  });
  return completion.choices[0]?.message?.content ?? "";
}

// Helper 2: Gemini API Call via OpenAI compatibility layer
async function callGemini(messages: any[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured.");
  }
  
  const geminiOpenAI = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });

  const completion = await geminiOpenAI.chat.completions.create({
    model: "gemini-1.5-pro", // High-quality thinking candidate model
    messages,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Multi-LLM Voting endpoint.
 * Evaluates a prompt against three reasoning/thinking model candidates in parallel:
 *   1. OpenAI o3-mini (thinking model)
 *   2. Google Gemini 1.5 Pro (thinking model)
 *   3. OpenAI o1-mini (thinking model)
 * Then runs the Validator Matcher (gpt-4o) using the VALIDATOR_SYSTEM_PROMPT.
 */
export const POST = withApiHandler("multi-llm", async (req) => {
  const startTime = Date.now();
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "127.0.0.1";

  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError("OPENAI_API_KEY is not configured on the server.", 500);
  }

  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];

  // RULE: Enforce 1024 input token limit check (estimate 1 token ≈ 4 characters)
  const totalInputChars = history.reduce((sum, m) => sum + m.content.length, 0);
  if (totalInputChars > 4096) {
    throw new ApiError("Total input history exceeds the limit of 1024 tokens (~4096 characters). Please clear history or shorten your message.", 400);
  }

  const userQuestion = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  // Set up candidate prompts
  const candidateMessages = [
    { role: "system", content: SYSTEM_PROMPTS.multiLlmCandidate },
    ...history,
  ];

  // Configure Candidate Models (Thinking/Reasoning Models)
  const candidateJobs: { modelName: string; job: Promise<string> }[] = [
    {
      modelName: "o3-mini",
      job: callOpenAI(candidateMessages, "o3-mini"),
    },
    {
      modelName: "gemini-1.5-pro",
      job: (async () => {
        const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
        if (hasGeminiKey) {
          try {
            return await callGemini(candidateMessages);
          } catch (e: any) {
            logger.warn("Gemini call failed in multi-llm route, falling back to OpenAI o1-mini", { error: e.message });
          }
        }
        return callOpenAI(candidateMessages, "o1-mini");
      })(),
    },
    {
      modelName: "o1-mini",
      job: callOpenAI(candidateMessages, "o1-mini"),
    },
  ];

  // Run in parallel
  const settled = await Promise.allSettled(candidateJobs.map((c) => c.job));
  const candidates = settled
    .map((result, idx) => ({
      model: candidateJobs[idx].modelName,
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
    throw new ApiError("All candidate models failed to respond. Check your API keys.", 502);
  }

  // Validator (Matcher) stage - using gpt-4o
  const matcherPrompt = [
    `Original question:\n${userQuestion}`,
    ``,
    `Candidate answers:`,
    ...candidates.map((c, i) => `--- Candidate ${i + 1} (${c.model}) ---\n${c.response}`),
  ].join("\n\n");

  const finalAnswer = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.multiLlmValidator },
      { role: "user", content: matcherPrompt },
    ],
    temperature: 0.3,
  });

  const reply = finalAnswer.choices[0]?.message?.content || "";

  // Basic Logging for multi-llm
  const latency = Date.now() - startTime;
  logger.info("Multi-LLM Voting API Report", {
    ip,
    endpoint: "/api/multi-llm",
    model: "gpt-4o-matcher",
    latencyMs: latency,
  });

  return NextResponse.json({
    reply,
    finalAnswer: reply,
    candidates,
    matcherModel: "gpt-4o",
  });
});
