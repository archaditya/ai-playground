import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp, getOtpExpiry } from "@/lib/otp";
import { sendEmail, buildOtpEmailHtml } from "@/lib/email";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const clientKey = getClientKey(req, "auth/send-otp");
  const { allowed } = await checkRateLimit(clientKey);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before requesting another code." },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  try {
    // Upsert user — create if first time, otherwise find existing
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    // Invalidate any unused OTP tokens for this user
    await prisma.otpToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate and store new OTP
    const otp = generateOtp();
    await prisma.otpToken.create({
      data: {
        userId: user.id,
        otpHash: hashOtp(otp),
        expiresAt: getOtpExpiry(),
      },
    });

    // Send OTP email via Brevo
    const emailSent = await sendEmail({
      to: email,
      subject: "Your AI Playground verification code",
      htmlContent: buildOtpEmailHtml(otp),
    });

    if (!emailSent) {
      logger.error("Failed to send OTP email", { email });
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    logger.info("OTP sent", { email });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("send-otp error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
