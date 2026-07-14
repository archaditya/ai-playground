import OpenAI from "openai";

/**
 * Single shared OpenAI client. Import this everywhere instead of
 * instantiating `new OpenAI()` per-route so config stays centralized.
 * 
 * At build time inside Docker, the OPENAI_API_KEY is not defined, so we
 * fallback to a dummy key to prevent the builder process from crashing.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build-time-pass",
});

export const OPENAI_MODELS = {
  fast: "gpt-4o-mini",
  smart: "gpt-4o",
} as const;

/**
 * Thin convenience wrapper for a single-turn or multi-turn chat completion.
 * Keeps route handlers free of SDK boilerplate.
 */
export async function openaiChat(params: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const { messages, model = OPENAI_MODELS.fast, temperature = 0.7, maxTokens = 1000 } = params;

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content ?? "";
}
