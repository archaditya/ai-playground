import type { ExperimentConfig } from "@/types";

export const EXPERIMENTS: ExperimentConfig[] = [
  {
    slug: "tool-calling",
    title: "Tool Calling",
    description: "LLM decides when to call functions (weather, calculator, search)",
    icon: "Wrench",
    apiPath: "/api/tools",
  },
  {
    slug: "persona-chat",
    title: "Persona Chat",
    description: "Chat with switchable AI personas (Einstein, Shakespeare, Yoda...)",
    icon: "Drama",
    apiPath: "/api/persona",
  },
  {
    slug: "multi-llm",
    title: "Multi-LLM Voting",
    description: "Query 3 LLMs in parallel, then a matcher model picks the best answer",
    icon: "Vote",
    apiPath: "/api/multi-llm",
  },
  {
    slug: "rag-chat",
    title: "RAG Chat",
    description: "Retrieval-augmented chat over your own text snippets",
    icon: "Database",
    apiPath: "/api/rag",
  },
  {
    slug: "chatgpt-clone",
    title: "ChatGPT Clone",
    description: "Full-stack ChatGPT clone with email OTP auth, Prisma ORM, Neon DB, and OpenAI stream chat.",
    icon: "MessageSquare",
    apiPath: "/api/chatgpt",
  },
];

export function getExperiment(slug: string) {
  return EXPERIMENTS.find((e) => e.slug === slug);
}
