import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "AI Playground",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}