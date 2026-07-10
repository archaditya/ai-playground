import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openaiChat, OPENAI_MODELS } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

interface PlanStep {
  step: string;
  goal: string;
}

/**
 * Workflow Agent — plans a task into ordered steps, executes each step
 * sequentially (each with its own LLM call, carrying forward prior step
 * outputs as context), then synthesizes a final answer. A simple, readable
 * stand-in for a LangChain/LangGraph-style agent.
 */
export const POST = withApiHandler("workflow", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const task = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  // 1. Plan: ask the model for a short ordered list of steps as JSON.
  const planRaw = await openaiChat({
    messages: [
      {
        role: "system",
        content:
          'Break the user\'s task into 2-4 ordered steps needed to fully answer it. Reply with ONLY JSON: {"steps":[{"step":"short name","goal":"what this step should produce"}]}',
      },
      { role: "user", content: task },
    ],
    model: OPENAI_MODELS.smart,
    temperature: 0.2,
  });

  let steps: PlanStep[] = [];
  try {
    const parsed = JSON.parse(planRaw.replace(/```json|```/g, "").trim());
    steps = Array.isArray(parsed.steps) ? parsed.steps : [];
  } catch {
    steps = [{ step: "Direct answer", goal: "Answer the task directly." }];
  }
  if (steps.length === 0) {
    steps = [{ step: "Direct answer", goal: "Answer the task directly." }];
  }

  // 2. Execute each step sequentially, carrying forward context.
  const stepOutputs: { step: string; goal: string; output: string }[] = [];
  let runningContext = "";

  for (const s of steps) {
    const output = await openaiChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.workflowAgent },
        {
          role: "user",
          content: `Overall task: ${task}\n\nCurrent step: "${s.step}" — Goal: ${s.goal}\n\nContext so far:\n${
            runningContext || "(none yet)"
          }\n\nProduce the output for this step only.`,
        },
      ],
      temperature: 0.5,
    });
    stepOutputs.push({ step: s.step, goal: s.goal, output });
    runningContext += `\n[${s.step}]: ${output}`;
  }

  // 3. Synthesize final answer.
  const finalAnswer = await openaiChat({
    messages: [
      { role: "system", content: "Synthesize the step outputs below into one clear final answer for the user." },
      { role: "user", content: `Task: ${task}\n\nStep outputs:${runningContext}` },
    ],
    temperature: 0.4,
  });

  return NextResponse.json({ reply: finalAnswer, meta: { steps: stepOutputs } });
});
