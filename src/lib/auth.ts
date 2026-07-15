import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "session";

interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a signed JWT for the given user.
 */
export async function createSessionToken(userId: string, email: string): Promise<string> {
  const expiry = process.env.JWT_EXPIRY ?? "7d";

  return new SignJWT({ email } as SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getJwtSecret());
}

/**
 * Verify a JWT string and return the payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    console.log("[verifySessionToken] Verifying token:", token.substring(0, 15) + "...");
    const { payload } = await jwtVerify(token, getJwtSecret());
    console.log("[verifySessionToken] Verification success, payload:", payload);
    if (!payload.sub || !payload.email) {
      console.warn("[verifySessionToken] Missing sub/email in payload");
      return null;
    }
    return payload as SessionPayload;
  } catch (err) {
    console.error("[verifySessionToken] Verification failed error:", err);
    return null;
  }
}

/**
 * Build Set-Cookie header value for the session token.
 */
export function buildSessionCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Build a Set-Cookie header that clears the session.
 */
export function buildClearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Read the session cookie from the current request context,
 * verify the JWT, and return the full User record from the database.
 *
 * Use this in Server Components, Server Actions, and API Route handlers.
 * Returns null if the user is not authenticated or not found in the DB.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  console.log("[getCurrentUser] sessionCookie:", sessionCookie ? { name: sessionCookie.name, valueExists: !!sessionCookie.value } : "null");

  if (!sessionCookie?.value) {
    return null;
  }

  const payload = await verifySessionToken(sessionCookie.value);
  console.log("[getCurrentUser] verifySessionToken payload:", payload);
  if (!payload?.sub) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });
    console.log("[getCurrentUser] database findUnique user:", user ? { id: user.id, email: user.email, isOnboarded: user.isOnboarded } : "null");
    return user;
  } catch (err) {
    console.error("[getCurrentUser] database query error:", err);
    return null;
  }
}

/**
 * Same as getCurrentUser but throws if not authenticated.
 * Convenience for server actions that require auth.
 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
