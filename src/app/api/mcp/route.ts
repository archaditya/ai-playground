import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openai, OPENAI_MODELS } from "@/lib/openai";
import { toolDefinitions, runTool } from "@/lib/tools";
import type OpenAI from "openai";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

/**
 * MCP Demo — simulates a Model Context Protocol style interaction: the
 * model is shown a list of available "resources/tools" (reusing the same
 * tool registry as Tool Calling) and must reason about which resource to
 * invoke, echoing back a structured trace of what it accessed.
 *
 * This is a simplified educational simulation, not a real MCP server —
 * swap in an actual @modelcontextprotocol/sdk client here if you want to
 * connect to real MCP servers.
 */
export const POST = withApiHandler("mcp", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as OpenAI.Chat.ChatCompletionMessageParam[];

  const systemPrompt = `You are demonstrating Model Context Protocol (MCP) style tool use.
Available resources are exposed to you as tools. When you use one, be transparent about which
resource/tool you accessed and why, then give the user a clear final answer.`;

  const first = await openai.chat.completions.create({
    model: OPENAI_MODELS.smart,
    messages: [{ role: "system", content: systemPrompt }, ...history],
    tools: toolDefinitions,
    temperature: 0.3,
  });

  const choice = first.choices[0];
  const toolCalls = choice.message.tool_calls;
  const trace: { resource: string; input: unknown; output: string }[] = [];

  if (!toolCalls || toolCalls.length === 0) {
    return NextResponse.json({ reply: choice.message.content ?? "", meta: { trace } });
  }

  const toolResultMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  for (const call of toolCalls) {
    if (call.type !== "function") continue;
    const args = JSON.parse(call.function.arguments || "{}");
    const result = await runTool(call.function.name, args);
    trace.push({ resource: call.function.name, input: args, output: result });
    toolResultMessages.push({ role: "tool", tool_call_id: call.id, content: result });
  }

  const final = await openai.chat.completions.create({
    model: OPENAI_MODELS.smart,
    messages: [{ role: "system", content: systemPrompt }, ...history, choice.message, ...toolResultMessages],
    temperature: 0.3,
  });

  return NextResponse.json({ reply: final.choices[0].message.content ?? "", meta: { trace } });
});
