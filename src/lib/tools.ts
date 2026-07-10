import OpenAI from "openai";

/**
 * Tool definitions shared by the Tool Calling and Workflow Agent demos.
 * Add a new tool by: (1) describing it here, (2) adding its implementation
 * to `toolImplementations`. Nothing else needs to change.
 */
export const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a given city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, e.g. 'Mumbai'" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a basic arithmetic expression.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "e.g. '(12 + 8) * 3'" },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Search the local mock knowledge base for a topic.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
];

/** Mock knowledge base used by search_knowledge_base — swap for a real DB later. */
const MOCK_KB: Record<string, string> = {
  langchain: "LangChain is a framework for building applications powered by LLMs, with abstractions for chains, agents, and retrieval.",
  "vector database": "A vector database stores embeddings and supports similarity search, commonly used for RAG pipelines.",
  "rate limiting": "Rate limiting restricts how many requests a client can make in a time window to protect backend resources.",
};

function safeCalculate(expression: string): string {
  // Only allow digits, whitespace, and basic math operators/parentheses.
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return "Error: expression contains disallowed characters.";
  }
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression})`)();
    return String(result);
  } catch {
    return "Error: could not evaluate expression.";
  }
}

/** Implementations, keyed by the same names declared in `toolDefinitions`. */
export const toolImplementations: Record<string, (args: any) => Promise<string> | string> = {
  get_weather: async ({ city }: { city: string }) => {
    // Placeholder mock — swap in a real weather API call when needed.
    const mockTemp = 20 + (city.length % 12);
    return `The weather in ${city} is approximately ${mockTemp}°C with clear skies. (mock data — wire up a real weather API here)`;
  },
  calculate: ({ expression }: { expression: string }) => safeCalculate(expression),
  search_knowledge_base: ({ query }: { query: string }) => {
    const key = Object.keys(MOCK_KB).find((k) => query.toLowerCase().includes(k));
    return key ? MOCK_KB[key] : `No knowledge base entry found for "${query}".`;
  },
};

export async function runTool(name: string, args: any): Promise<string> {
  const impl = toolImplementations[name];
  if (!impl) return `Error: unknown tool "${name}".`;
  return impl(args);
}
