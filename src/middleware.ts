import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

/**
 * Routes that require a valid session cookie.
 */
const PROTECTED_PREFIXES = ["/chatgpt-clone", "/onboard"];

/**
 * Routes that should redirect TO the app if already authenticated.
 */
const AUTH_ROUTES = ["/sign-in"];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  console.log(`[middleware] isAuthenticated check for pathname [${req.nextUrl.pathname}], token exists:`, !!token);
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    console.log(`[middleware] token verification success for sub:`, payload.sub);
    return !!payload.sub;
  } catch (err) {
    console.error(`[middleware] token verification failed error:`, err);
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authenticated = await isAuthenticated(req);

  // Protected routes: redirect to sign-in if not authenticated
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtected && !authenticated) {
    console.log(`[middleware] redirecting [${pathname}] -> [/sign-in] because not authenticated`);
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Auth routes: redirect to home if already authenticated
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && authenticated) {
    console.log(`[middleware] redirecting auth-route [${pathname}] -> [/] because already authenticated`);
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Tag request path in response headers (preserving existing behavior)
  const res = NextResponse.next();
  res.headers.set("x-request-path", pathname);
  return res;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
