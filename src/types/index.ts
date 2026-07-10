export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  /** Optional per-message metadata, e.g. which model produced it. */
  meta?: Record<string, unknown>;
}

export interface ExperimentConfig {
  slug: string;
  title: string;
  description: string;
  /** lucide-react icon name, resolved in the sidebar */
  icon: string;
  apiPath: string;
}

/** Shape returned by /api/multi-llm */
export interface MultiLLMResponse {
  candidates: { model: string; response: string }[];
  finalAnswer: string;
  matcherModel: string;
}
