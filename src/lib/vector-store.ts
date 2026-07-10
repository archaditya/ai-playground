import { cosineSimilarity, embedBatch, embedText } from "./embeddings";

export interface VectorRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorStore {
  upsert(records: { id: string; text: string; metadata?: Record<string, unknown> }[]): Promise<void>;
  query(text: string, topK?: number): Promise<{ id: string; text: string; score: number; metadata?: Record<string, unknown> }[]>;
  clear(namespace?: string): Promise<void>;
}

/**
 * In-memory vector store. Zero external dependencies — perfect for weekend
 * demos and the default `VECTOR_DB_PROVIDER=memory`. Swap this module out
 * for a Pinecone/Supabase implementation without touching calling code,
 * since they all satisfy the same `VectorStore` interface.
 *
 * NOTE: state resets on server restart / per lambda instance. For anything
 * that needs to persist, plug in a real vector DB.
 */
class InMemoryVectorStore implements VectorStore {
  private records: Map<string, VectorRecord> = new Map();

  async upsert(items: { id: string; text: string; metadata?: Record<string, unknown> }[]) {
    const embeddings = await embedBatch(items.map((i) => i.text));
    items.forEach((item, idx) => {
      this.records.set(item.id, {
        id: item.id,
        text: item.text,
        embedding: embeddings[idx],
        metadata: item.metadata,
      });
    });
  }

  async query(text: string, topK = 4) {
    if (this.records.size === 0) return [];
    const queryEmbedding = await embedText(text);
    const scored = Array.from(this.records.values()).map((r) => ({
      id: r.id,
      text: r.text,
      metadata: r.metadata,
      score: cosineSimilarity(queryEmbedding, r.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async clear() {
    this.records.clear();
  }
}

// Singleton so all API routes in the same server process share the same store.
const globalForStore = globalThis as unknown as { vectorStore?: InMemoryVectorStore };

export const vectorStore: VectorStore =
  globalForStore.vectorStore ?? (globalForStore.vectorStore = new InMemoryVectorStore());

/**
 * To add a real vector DB provider:
 * 1. Implement the `VectorStore` interface in a new file (e.g. pinecone-store.ts).
 * 2. Export it, and switch this file's default export based on
 *    `process.env.VECTOR_DB_PROVIDER`.
 */
