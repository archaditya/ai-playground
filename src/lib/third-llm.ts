import OpenAI from "openai";

/**
 * Optional third model for Multi-LLM Voting. Any OpenAI-compatible endpoint
 * works here (Groq, Together, Mistral, Fireworks, local Ollama, etc).
 * If THIRD_LLM_API_KEY / THIRD_LLM_BASE_URL are not set, callers should
 * fall back to a second OpenAI model instead (see /api/multi-llm/route.ts).
 */
export const thirdLLMConfigured = Boolean(
  process.env.THIRD_LLM_API_KEY && process.env.THIRD_LLM_BASE_URL
);

export const thirdLLM = thirdLLMConfigured
  ? new OpenAI({
      apiKey: process.env.THIRD_LLM_API_KEY,
      baseURL: process.env.THIRD_LLM_BASE_URL,
    })
  : null;

export const THIRD_LLM_MODEL = process.env.THIRD_LLM_MODEL ?? "llama-3.1-70b-versatile";

export async function thirdLLMChat(params: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}) {
  if (!thirdLLM) throw new Error("Third LLM provider is not configured.");
  const { messages, temperature = 0.7, maxTokens = 1000 } = params;

  const completion = await thirdLLM.chat.completions.create({
    model: THIRD_LLM_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content ?? "";
}
