import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-helpers";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { openaiChat } from "@/lib/openai";
import path from "path";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export const POST = withApiHandler("rag", async (req) => {
  const body = requestSchema.parse(await req.json());

  const history = body.messages.filter((m) => m.role !== "system");
  const question =
    [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  let results: any[] = [];

  const url = process.env.QDRANT_URL || "http://localhost:6333";
  const collectionName = process.env.QDRANT_COLLECTION || "rag-practice";

  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url,
        collectionName,
      },
    );

    const vectorRetriever = vectorStore.asRetriever({ k: 5 });
    results = await vectorRetriever.invoke(question);
  } catch (error) {
    console.error(
      "Vector store query failed (e.g., collection not created yet):",
      error,
    );
  }

  const SYSTEM_PROMPT = `
    You are an expert in answering user queries based on the provided context about the documents.
    Do not answer anything beyond what is provided in the context.

    Always answer the user with a short explanation, stating which page number that content is available on, and the name of the book/file.

    User Documents:
    ${results.map((e) => JSON.stringify({ 
      bookName: e.metadata?.source ? path.basename(e.metadata.source) : "Unknown Book", 
      pageContent: e.pageContent, 
      pageNumber: e.metadata?.loc?.pageNumber || "Unknown" 
    })).join("\n\n")}
  `;

  const reply = await openaiChat({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    temperature: 0.3,
  });

  return NextResponse.json({
    reply,
    meta: {
      sourcesUsed: results.length,
    },
  });
});
