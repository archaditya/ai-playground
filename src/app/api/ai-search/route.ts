import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { openaiChat } from "@/lib/openai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1) }))
    .min(1),
});

/**
 * AI Search — placeholder search-augmented synthesis. Wire up a real
 * search provider (Tavily, Serper, Bing, Exa, etc.) inside `fetchSearchResults`
 * below; everything downstream (synthesis prompt, route contract) stays the same.
 */
async function fetchSearchResults(query: string): Promise<{ title: string; snippet: string; url: string }[]> {
  // TODO: replace with a real search API call, e.g.:
  // const res = await fetch(`https://api.tavily.com/search`, { ... });
  return [
    {
      title: "Search provider not configured",
      snippet:
        "This is placeholder data. Add a SEARCH_API_KEY and implement fetchSearchResults() in src/app/api/ai-search/route.ts to enable live web search.",
      url: "https://example.com",
    },
  ];
}

export const POST = withApiHandler("ai-search", async (req) => {
  const body = requestSchema.parse(await req.json());
  const history = body.messages.filter((m) => m.role !== "system") as {
    role: "user" | "assistant";
    content: string;
  }[];
  const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  const results = await fetchSearchResults(question);
  const context = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`).join("\n\n");

  const reply = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.aiSearch },
      { role: "user", content: `Search results:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.4,
  });

  return NextResponse.json({ reply, meta: { sources: results } });
});
