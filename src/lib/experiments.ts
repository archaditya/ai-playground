import type { ExperimentConfig } from "@/types";

/**
 * Single source of truth for every experiment/assignment in the playground.
 * Add a new assignment by adding one entry here + one page.tsx + one
 * route.ts. The sidebar and dashboard render entirely from this list.
 */
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
  // {
  //   slug: "memory-agent",
  //   title: "Memory Agent",
  //   description: "Conversational agent that remembers facts across turns",
  //   icon: "BrainCircuit",
  //   apiPath: "/api/memory",
  // },
  // {
  //   slug: "mcp-demo",
  //   title: "MCP Demo",
  //   description: "Model Context Protocol style tool/resource exposure demo",
  //   icon: "Plug",
  //   apiPath: "/api/mcp",
  // },
  // {
  //   slug: "workflow-agent",
  //   title: "Workflow Agent",
  //   description: "Breaks a task into steps and executes them in sequence",
  //   icon: "Workflow",
  //   apiPath: "/api/workflow",
  // },
  // {
  //   slug: "youtube-rag",
  //   title: "YouTube RAG",
  //   description: "Chat over a YouTube video's transcript",
  //   icon: "Youtube",
  //   apiPath: "/api/youtube-rag",
  // },
  // {
  //   slug: "pdf-chat",
  //   title: "PDF Chat",
  //   description: "Chat over an uploaded PDF's content",
  //   icon: "FileText",
  //   apiPath: "/api/pdf-chat",
  // },
  // {
  //   slug: "ai-search",
  //   title: "AI Search",
  //   description: "Search-augmented answer synthesis",
  //   icon: "Search",
  //   apiPath: "/api/ai-search",
  // },
];

export function getExperiment(slug: string) {
  return EXPERIMENTS.find((e) => e.slug === slug);
}
