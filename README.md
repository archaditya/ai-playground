# AI Engineering Playground

A reusable **Next.js 15 (App Router)** starter for a GenAI cohort — one dashboard, one page per
assignment. Built so a new experiment (RAG variant, agent pattern, tool demo, etc.) can be added
with **one registry entry + one page + one API route**, without touching the shell, theme, or
existing experiments.

This is **not** a SaaS product. It's an AI Engineering Playground for quick, well-structured
weekend builds.

---

## ✨ What's included out of the box

| Assignment | Route | Description |
|---|---|---|
| Persona Chat | `/persona-chat` → `/api/persona` | Chat with switchable personas (Einstein, Shakespeare, Yoda, Sherlock, Steve Jobs) |
| Multi-LLM Voting | `/multi-llm` → `/api/multi-llm` | 3 models answer in parallel → a matcher LLM picks/synthesizes the best final answer |
| RAG Chat | `/rag-chat` → `/api/rag` | Paste text, get it embedded + chunked, ask grounded questions |
| Tool Calling | `/tool-calling` → `/api/tools` | Model decides when to call a function (weather, calculator, KB search) |
| Memory Agent | `/memory-agent` → `/api/memory` | Extracts & reuses durable facts across the session |
| MCP Demo | `/mcp-demo` → `/api/mcp` | Simplified Model Context Protocol–style resource access + trace |
| Workflow Agent | `/workflow-agent` → `/api/workflow` | Plans a task into steps, executes sequentially, synthesizes |
| YouTube RAG | `/youtube-rag` → `/api/youtube-rag` | RAG over a pasted video transcript |
| PDF Chat | `/pdf-chat` → `/api/pdf-chat` | Client-side PDF text extraction (pdfjs-dist) + RAG |
| AI Search | `/ai-search` → `/api/ai-search` | Search-augmented synthesis (placeholder — wire up Tavily/Serper/Exa) |

**Persona Chat** and **Multi-LLM Voting** are your two existing projects, ported onto this shared
architecture — same behavior, now backed by reusable helpers instead of one-off code.

---

## 🧱 Tech stack

- Next.js 15 (App Router) + TypeScript
- TailwindCSS + hand-rolled shadcn/ui-style components (no CLI dependency)
- Node.js runtime API routes
- OpenAI SDK + Anthropic SDK (+ optional 3rd OpenAI-compatible provider)
- LangChain (available for experiments that want chains/agents)
- React Hook Form + Zod (form/validation utilities, wired into request schemas)
- In-memory vector store (pluggable — swap for Pinecone/Supabase)

---

## 📁 Folder structure

```
src/
  app/
    page.tsx                 # Dashboard (renders from EXPERIMENTS registry)
    layout.tsx                # Root layout — sidebar + theme + toaster
    globals.css                # Dark glass theme (CSS variables)
    <slug>/page.tsx             # One page per assignment
    api/<slug>/route.ts          # One POST route per assignment
  components/
    ui/                    # Button, Card, Input, Select, ScrollArea, etc.
    layout/                  # Sidebar, MobileNav, AppShell, PageHeader
    chat/                     # ChatPanel, ChatMessageBubble, ConfigPanel, EmptyState
  hooks/
    use-chat.ts               # Shared chat state/orchestration hook
  lib/
    openai.ts / anthropic.ts / third-llm.ts   # LLM clients
    prompts.ts                 # Centralized prompt + persona registry
    tools.ts                    # Tool/function definitions + implementations
    embeddings.ts / vector-store.ts   # RAG primitives
    api-helpers.ts                # withApiHandler() — rate limit + error handling wrapper
    rate-limit.ts / logger.ts        # Cross-cutting concerns
    experiments.ts                 # ⭐ Single source of truth for sidebar + dashboard
  types/index.ts
```

---

## ➕ Adding a new assignment

1. Add one entry to `src/lib/experiments.ts` (slug, title, description, icon, apiPath).
2. Create `src/app/<slug>/page.tsx` — copy an existing simple page (e.g. `rag-chat`) and adjust
   the `ConfigPanel` contents + `useChat` options.
3. Create `src/app/api/<slug>/route.ts` — wrap your handler in `withApiHandler("<slug>", ...)`
   for automatic rate limiting, logging, and error formatting.

No changes are needed to the sidebar, dashboard, theme, or any other experiment.

---

## 🚀 Getting started

```bash
npm install
cp .env.example .env   # then fill in your API keys
npm run dev
```

Visit `http://localhost:3000`.

### Required environment variables

At minimum, set `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in `.env` — see `.env.example` for the
full list (vector DB provider, rate limit tuning, optional 3rd LLM for Multi-LLM Voting, etc).

---

## 🐳 Docker

```bash
docker compose up --build
```

Uses a multi-stage build with Next's `output: "standalone"` for a small production image.
Set your `.env` file before running — `docker-compose.yml` loads it via `env_file`.

---

## 🔒 Rate limiting & error handling

Every API route is wrapped with `withApiHandler(routeName, handler)` from
`src/lib/api-helpers.ts`, which provides:

- Per-IP, per-route in-memory rate limiting (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`)
- Structured JSON logging via `src/lib/logger.ts`
- Consistent error responses for Zod validation errors, known `ApiError`s, and unexpected failures

For multi-instance deployments, swap the in-memory bucket in `rate-limit.ts` for Redis/Upstash —
the function signature stays the same.

---

## 🧠 Vector store & embeddings

`src/lib/vector-store.ts` ships an in-memory implementation (zero external dependencies) behind a
small `VectorStore` interface. To add Pinecone/Supabase:

1. Implement the same interface in a new file.
2. Select it based on `process.env.VECTOR_DB_PROVIDER` in `vector-store.ts`.

Nothing in the RAG / YouTube RAG / PDF Chat routes needs to change.

---

## 🧪 CI

`.github/workflows/ci.yml` runs type-checking, linting, and a production build on every push/PR
to `main`.

---

## Notes on scope

This template intentionally keeps things lightweight:

- No auth, billing, or multi-tenant concerns (not a SaaS).
- In-memory state (vector store, rate limiter) resets on restart — fine for demos, swap for
  persistent stores if an assignment needs it.
- AI Search ships with placeholder results — wire up a real search API when needed.

Built for fast iteration, not maximal completeness. Extend only what a given assignment needs.

---
### Migration CMDs
```bash
docker exec -it ai-playground-app sh

npx prisma migrate dev / deploy

```