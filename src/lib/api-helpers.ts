import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";
import { checkRateLimit, getClientKey } from "./rate-limit";
import { errorMessage } from "./utils";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Wraps a POST route handler with:
 *  - rate limiting (per-IP, per-route)
 *  - structured request/response logging
 *  - consistent error → JSON response mapping (Zod, ApiError, unknown)
 *
 * Usage in a route.ts file:
 *
 *   export const POST = withApiHandler("persona", async (req) => {
 *     const body = personaSchema.parse(await req.json());
 *     ...
 *     return NextResponse.json({ reply });
 *   });
 */
export function withApiHandler(
  routeName: string,
  handler: (req: Request) => Promise<NextResponse>
) {
  return async function wrapped(req: Request): Promise<NextResponse> {
    const start = Date.now();
    const clientKey = getClientKey(req, routeName);

    const { allowed, remaining, resetAt } = checkRateLimit(clientKey);
    if (!allowed) {
      logger.warn("Rate limit exceeded", { route: routeName, clientKey });
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
          },
        }
      );
    }

    try {
      logger.info("Request received", { route: routeName });
      const response = await handler(req);
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      logger.info("Request completed", { route: routeName, ms: Date.now() - start });
      return response;
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn("Validation error", { route: routeName, issues: err.issues });
        return NextResponse.json(
          { error: "Invalid request payload.", details: err.issues },
          { status: 422 }
        );
      }
      if (err instanceof ApiError) {
        logger.warn("API error", { route: routeName, message: err.message });
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      logger.error("Unhandled error", { route: routeName, message: errorMessage(err) });
      return NextResponse.json(
        { error: "Something went wrong processing your request." },
        { status: 500 }
      );
    }
  };
}
