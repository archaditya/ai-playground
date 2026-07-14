import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashOtp, isOtpValid } from "@/lib/otp";
import { createSessionToken, buildSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const clientKey = getClientKey(req, "auth/verify-otp");
  const { allowed } = await checkRateLimit(clientKey);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait before trying again." },
      { status: 429 }
    );
  }

  let body: { email?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const otp = body.otp?.trim();

  if (!email || !otp) {
    return NextResponse.json(
      { error: "Email and verification code are required." },
      { status: 400 }
    );
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json(
      { error: "Verification code must be 6 digits." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "No account found for this email." },
        { status: 404 }
      );
    }

    // Find the most recent unused OTP token for this user
    const otpToken = await prisma.otpToken.findFirst({
      where: { userId: user.id, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otpToken) {
      return NextResponse.json(
        { error: "No pending verification code. Please request a new one." },
        { status: 400 }
      );
    }

    // Check validity (expiry, attempts, used)
    const validity = isOtpValid(otpToken);
    if (!validity.valid) {
      return NextResponse.json({ error: validity.reason }, { status: 400 });
    }

    // Verify the OTP hash
    const submittedHash = hashOtp(otp);
    if (submittedHash !== otpToken.otpHash) {
      // Increment attempt counter
      await prisma.otpToken.update({
        where: { id: otpToken.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = 3 - (otpToken.attempts + 1);
      const message =
        remainingAttempts > 0
          ? `Invalid code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
          : "Too many incorrect attempts. Please request a new code.";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.otpToken.update({
      where: { id: otpToken.id },
      data: { used: true },
    });

    // Create session JWT
    const token = await createSessionToken(user.id, user.email);

    // Build response with Set-Cookie header
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isOnboarded: user.isOnboarded,
      },
    });

    response.headers.set("Set-Cookie", buildSessionCookie(token));

    logger.info("User authenticated", { email });
    return response;
  } catch (error) {
    logger.error("verify-otp error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
