import { openai } from "./openai";

const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL ?? "text-embedding-3-small";

/** Embed a single string. */
export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDINGS_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/** Embed many strings in one batched call (cheaper + faster than looping). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai.embeddings.create({
    model: EMBEDDINGS_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Simple fixed-size chunking with overlap — good enough for weekend RAG demos. */
export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}
