import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ANTHROPIC_MODELS = {
  fast: "claude-3-5-haiku-20241022",
  smart: "claude-3-5-sonnet-20241022",
} as const;

/**
 * Thin convenience wrapper for a single/multi-turn Claude completion.
 */
export async function anthropicChat(params: {
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const {
    system,
    messages,
    model = ANTHROPIC_MODELS.fast,
    temperature = 0.7,
    maxTokens = 1000,
  } = params;

  const response = await anthropic.messages.create({
    model,
    system,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const block = response.content[0];
  return block?.type === "text" ? block.text : "";
}
