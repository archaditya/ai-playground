import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openai, OPENAI_MODELS } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { toolDefinitions, runTool } from "@/lib/tools";
import type OpenAI from "openai";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

/**
 * Tool Calling — lets the model decide whether to invoke one of the tools
 * defined in src/lib/tools.ts, executes it, then feeds the result back for
 * a final natural-language answer.
 */
export const POST = withApiHandler("tools", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as OpenAI.Chat.ChatCompletionMessageParam[];

  const baseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPTS.toolCalling },
    ...history,
  ];

  const first = await openai.chat.completions.create({
    model: OPENAI_MODELS.smart,
    messages: baseMessages,
    tools: toolDefinitions,
    temperature: 0.3,
  });

  const choice = first.choices[0];
  const toolCalls = choice.message.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    return NextResponse.json({ reply: choice.message.content ?? "", meta: { toolsUsed: [] } });
  }

  // Execute every requested tool call, then send results back for a final answer.
  const toolResultMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  const toolsUsed: string[] = [];

  for (const call of toolCalls) {
    if (call.type !== "function") continue;
    const args = JSON.parse(call.function.arguments || "{}");
    const result = await runTool(call.function.name, args);
    toolsUsed.push(call.function.name);
    toolResultMessages.push({
      role: "tool",
      tool_call_id: call.id,
      content: result,
    });
  }

  const final = await openai.chat.completions.create({
    model: OPENAI_MODELS.smart,
    messages: [...baseMessages, choice.message, ...toolResultMessages],
    temperature: 0.3,
  });

  return NextResponse.json({
    reply: final.choices[0].message.content ?? "",
    meta: { toolsUsed },
  });
});
