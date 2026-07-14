import { logger } from "./logger";

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
}

/**
 * Send a transactional email via Brevo REST API.
 * Zero dependencies — uses native fetch.
 */
export async function sendEmail({ to, subject, htmlContent }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    logger.error("Email config missing", {
      hasApiKey: !!apiKey,
      hasSender: !!senderEmail,
    });
    throw new Error("Email service is not configured");
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "AI Playground", email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Brevo API error", {
        status: response.status,
        body: errorBody,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Failed to send email", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Build a styled HTML email body for OTP delivery.
 */
export function buildOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background-color:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#38bdf8);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:20px;">✨</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#fafafa;">
                Verify your email
              </h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.5;">
                Enter this code to sign in to AI Playground.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="background-color:#09090b;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px 32px;display:inline-block;">
                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#fafafa;font-family:'Courier New',monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                This code expires in 5 minutes.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
