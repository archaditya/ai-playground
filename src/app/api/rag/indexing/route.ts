import { withApiHandler } from "@/lib/api-helpers";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import path from "path";
import { readdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const files = await readdir(publicDir);
    const pdfFiles = files.filter((file) =>
      file.toLowerCase().endsWith(".pdf"),
    );
    return NextResponse.json({ files: pdfFiles });
  } catch (error) {
    console.error("Failed to read public directory:", error);
    return NextResponse.json({ files: [] });
  }
}

export const POST = withApiHandler("rag-indexing", async (req) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileNameToStore = formData.get("fileName") as string | null;

  let filePath = "";

  if (file) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    filePath = path.join(process.cwd(), "public", file.name);
    await writeFile(filePath, buffer);
  } else if (fileNameToStore) {
    filePath = path.join(process.cwd(), "public", fileNameToStore);
  } else {
    return NextResponse.json(
      { error: "No file or filename provided." },
      { status: 400 },
    );
  }

  const url = process.env.QDRANT_URL || "http://localhost:6333";
  const collectionName = process.env.QDRANT_COLLECTION || "rag-practice";

  const client = new QdrantClient({ url });

  const existsResult = await client.collectionExists(collectionName);
  if (!existsResult.exists) {
    await client.createCollection(collectionName, {
      vectors: {
        size: 1536,
        distance: "Cosine",
      },
    });
  } else {
    try {
      const scrollResult = await client.scroll(collectionName, {
        filter: {
          must: [
            {
              key: "metadata.source",
              match: {
                value: filePath,
              },
            },
          ],
        },
        limit: 1,
      });
      
      if (scrollResult.points && scrollResult.points.length > 0) {
        return NextResponse.json({
          success: true,
          message: `${path.basename(filePath)} is already indexed. Skipping.`,
          chunksCount: 0,
          alreadyIndexed: true,
        });
      }
    } catch (err) {
      console.error("Failed to scroll collection for duplicate checks:", err);
    }
  }

  const loader = new PDFLoader(filePath);
  const documents = await loader.load();

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL!,
      collectionName: collectionName,
    },
  );

  await vectorStore.addDocuments(documents);

  return NextResponse.json({
    success: true,
    message: `${path.basename(filePath)} indexed successfully!`,
    chunksCount: documents.length,
  });
});
