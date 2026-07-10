import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/api-helpers";
import { openai } from "@/lib/openai";
import { PERSONAS, type PersonaKey } from "@/lib/prompts";
import { logger } from "@/lib/logger";
import { getWeather, getYouTubeVideosData } from "@/lib/tools";

// Input schema validation (Rule: Message length limit max 4000 characters)
const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z
          .string()
          .min(1)
          .max(4000, "Message length exceeds the limit of 4000 characters."),
      }),
    )
    .min(1),
  persona: z.string(),
});

// Helper to sanitize model's JSON string output
function cleanAndParseJson(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
}

/**
 * Persona Chat API route.
 * Employs a multi-step agent loop (INITIAL, THINK, TOOL_REQUEST, ANALYSE, OUTPUT),
 * integrates native weather/YouTube APIs, respects a 30s timeout,
 * and tracks IP, endpoint, tokens, latency, and costs.
 */
export const POST = withApiHandler("persona", async (req) => {
  const startTime = Date.now();

  // Extract client IP address
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "127.0.0.1";

  // Env Validation
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError("OPENAI_API_KEY is not configured on the server.", 500);
  }

  const body = requestSchema.parse(await req.json());
  const personaKey = body.persona as PersonaKey;
  const persona = PERSONAS[personaKey];

  if (!persona) {
    throw new ApiError(`Unknown persona "${body.persona}".`, 400);
  }

  // Filter history
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];

  // RULE: Enforce 1024 input token limit check (estimate 1 token ≈ 4 characters)
  const totalInputChars = history.reduce((sum, m) => sum + m.content.length, 0);
  if (totalInputChars > 4096) {
    throw new ApiError(
      "Total input history exceeds the limit of 1024 tokens (~4096 characters). Please clear history or shorten your message.",
      400,
    );
  }

  // System Prompt matching the original persona style + pipeline rules
  const systemPrompt = persona.systemPrompt;

  // Compile LLM messages history
  const llmMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let finalAssistantRes = "";

  // Rule: Timeout after 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("Request timeout after 30 seconds")),
      30000,
    ),
  );

  const agentLoop = async () => {
    let loopCount = 0;
    const maxLoops = 8; // Safety cap to prevent infinite loops

    while (loopCount < maxLoops) {
      loopCount++;

      // Decide which model to use based on persona
      const isAgentLoopNeeded =
        personaKey === "hitesh" || personaKey === "piyush";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: llmMessages,
        temperature: 0.8,
      });

      const agentRes = completion.choices[0]?.message?.content || "";
      totalPromptTokens += completion.usage?.prompt_tokens || 0;
      totalCompletionTokens += completion.usage?.completion_tokens || 0;

      if (!isAgentLoopNeeded) {
        finalAssistantRes = agentRes;
        break;
      }

      // Process the agent step (Hitesh / Piyush loop)
      let parsedRes: any = "";
      try {
        parsedRes = cleanAndParseJson(agentRes);
      } catch (e) {
        parsedRes = { step: "OUTPUT", text: agentRes };
      }

      // Add assistant response to history
      llmMessages.push({ role: "assistant", content: agentRes });

      if (parsedRes.step?.toUpperCase() === "OUTPUT") {
        finalAssistantRes = parsedRes.text || agentRes;
        break;
      }

      if (parsedRes.step?.toUpperCase() === "TOOL_REQUEST") {
        const { functionName, input } = parsedRes;
        let toolResult = "";

        if (
          functionName === "getWeatherData" ||
          functionName === "get_weather"
        ) {
          let cityName = "";
          if (typeof input === "string") {
            try {
              const parsed = cleanAndParseJson(input);
              cityName = parsed.cityName || parsed;
            } catch (e) {
              cityName = input;
            }
          } else {
            cityName = input?.cityName || input;
          }
          toolResult = await getWeather(cityName);
        } else if (
          functionName === "getYouTubeVideosData" ||
          functionName === "get_youtube_videos"
        ) {
          let parsedInput = input;
          if (typeof input === "string") {
            try {
              parsedInput = cleanAndParseJson(input);
            } catch (e) {
              parsedInput = { topic: input };
            }
          }
          const channelName =
            parsedInput?.channelName ||
            (personaKey === "hitesh" ? "chaiaurcode" : "piyushgargdev");
          const topic = parsedInput?.topic || "";
          toolResult = await getYouTubeVideosData(channelName, topic);
        }

        // Push tool output to developers/system history
        llmMessages.push({
          role: "developer" as any,
          content: JSON.stringify({
            step: "TOOL_OUTPUT",
            output: toolResult,
          }),
        });
      } else {
        if (loopCount >= maxLoops - 1) {
          llmMessages.push({
            role: "system",
            content:
              "You are reaching the limits of thinking. Please output your final answer using the 'OUTPUT' step now.",
          });
        }
      }
    }

    return finalAssistantRes;
  };

  try {
    const reply = await Promise.race([agentLoop(), timeoutPromise]);

    const latency = Date.now() - startTime;
    const cost =
      totalPromptTokens * 0.000005 + totalCompletionTokens * 0.000015;

    // Rule: Basic Logging of IP, Endpoint, Model, Tokens, Latency, Cost (approx)
    logger.info("Persona API Execution Report", {
      ip,
      endpoint: "/api/persona",
      model: "gpt-4o",
      tokens: {
        prompt: totalPromptTokens,
        completion: totalCompletionTokens,
        total: totalPromptTokens + totalCompletionTokens,
      },
      latencyMs: latency,
      costApproxUSD: Number(cost.toFixed(6)),
    });

    return NextResponse.json({
      reply,
      meta: {
        persona: body.persona,
        short: persona.short,
        color: persona.color,
      },
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error("Persona API Error", {
      ip,
      endpoint: "/api/persona",
      error: error.message,
      latencyMs: latency,
    });
    throw new ApiError(
      error.message || "Failed to generate persona response.",
      500,
    );
  }
});