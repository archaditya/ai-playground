import { createHash, randomInt } from "node:crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

/**
 * Generate a cryptographically random 6-digit OTP.
 */
export function generateOtp(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(randomInt(min, max + 1));
}

/**
 * Hash an OTP using SHA-256. We never store the OTP in plain text.
 */
export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Calculate the OTP expiration timestamp.
 */
export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Check if an OTP token record is still valid for verification.
 */
export function isOtpValid(otpToken: {
  expiresAt: Date;
  attempts: number;
  used: boolean;
}): { valid: boolean; reason?: string } {
  if (otpToken.used) {
    return { valid: false, reason: "This code has already been used." };
  }
  if (otpToken.attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, reason: "Too many incorrect attempts. Please request a new code." };
  }
  if (new Date() > otpToken.expiresAt) {
    return { valid: false, reason: "This code has expired. Please request a new one." };
  }
  return { valid: true };
}
