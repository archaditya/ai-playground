import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/api-helpers";
import { openai } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { getWeather, getYouTubeVideosData, safeCalculate } from "@/lib/tools";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

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
 * Tool Calling Route — Simulates chatgpt/LLM call with tools only (no persona part).
 * Uses the multi-turn agent reasoning loop (INITIAL -> THINK -> TOOL_REQUEST -> ANALYSE -> OUTPUT).
 */
export const POST = withApiHandler("tools", async (req) => {
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

  const llmMessages: any[] = [
    { role: "system", content: SYSTEM_PROMPTS.toolCalling },
    ...history,
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let finalAssistantRes = "";
  const toolsUsed: string[] = [];

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout after 30 seconds")), 30000)
  );

  const agentLoop = async () => {
    let loopCount = 0;
    const maxLoops = 8;

    while (loopCount < maxLoops) {
      loopCount++;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: llmMessages,
        temperature: 0.5,
      });

      const agentRes = completion.choices[0]?.message?.content || "";
      totalPromptTokens += completion.usage?.prompt_tokens || 0;
      totalCompletionTokens += completion.usage?.completion_tokens || 0;

      let parsedRes: any = "";
      try {
        parsedRes = cleanAndParseJson(agentRes);
      } catch (e) {
        parsedRes = { step: "OUTPUT", text: agentRes };
      }

      llmMessages.push({ role: "assistant", content: agentRes });

      if (parsedRes.step?.toUpperCase() === "OUTPUT") {
        finalAssistantRes = parsedRes.text || agentRes;
        break;
      }

      if (parsedRes.step?.toUpperCase() === "TOOL_REQUEST") {
        const { functionName, input } = parsedRes;
        let toolResult = "";

        if (functionName === "get_weather" || functionName === "getWeatherData") {
          let cityName = "";
          if (typeof input === "string") {
            try {
              const parsed = cleanAndParseJson(input);
              cityName = parsed.cityName || parsed.city || parsed;
            } catch (e) {
              cityName = input;
            }
          } else {
            cityName = input?.cityName || input?.city || input;
          }
          toolsUsed.push("get_weather");
          toolResult = await getWeather(cityName);
        } else if (functionName === "calculate") {
          let expression = "";
          if (typeof input === "string") {
            try {
              const parsed = cleanAndParseJson(input);
              expression = parsed.expression || parsed;
            } catch (e) {
              expression = input;
            }
          } else {
            expression = input?.expression || input;
          }
          toolsUsed.push("calculate");
          toolResult = safeCalculate(expression);
        } else if (functionName === "get_youtube_videos" || functionName === "getYouTubeVideosData") {
          let parsedInput = input;
          if (typeof input === "string") {
            try {
              parsedInput = cleanAndParseJson(input);
            } catch (e) {
              parsedInput = { topic: input };
            }
          }
          const channelName = parsedInput?.channelName || "chaiaurcode";
          const topic = parsedInput?.topic || "";
          toolsUsed.push("get_youtube_videos");
          toolResult = await getYouTubeVideosData(channelName, topic);
        }

        // Send tool output back as dev/system message
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
            content: "Please output your final answer using the 'OUTPUT' step now."
          });
        }
      }
    }

    return finalAssistantRes;
  };

  try {
    const reply = await Promise.race([agentLoop(), timeoutPromise]);
    const latency = Date.now() - startTime;
    const cost = (totalPromptTokens * 0.000005) + (totalCompletionTokens * 0.000015);

    logger.info("Tool Calling API Execution Report", {
      ip,
      endpoint: "/api/tools",
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
      meta: { toolsUsed },
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error("Tool Calling API Error", {
      ip,
      endpoint: "/api/tools",
      error: error.message,
      latencyMs: latency,
    });
    throw new ApiError(error.message || "Failed to process tool-calling loop.", 500);
  }
});
