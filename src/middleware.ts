import { NextResponse, type NextRequest } from "next/server";

/**
 * Global middleware. Rate limiting itself lives in `withApiHandler`
 * (per-route, in lib/api-helpers.ts) since it needs to run in the Node
 * runtime for full control; this middleware handles cheap, edge-safe
 * concerns: basic request tagging and a safety net for missing content-type.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-request-path", req.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
