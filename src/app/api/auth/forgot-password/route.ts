import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import { EmailService } from "@/lib/email-service";
import crypto from "crypto";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    logger.info("Password reset requested", { email });

    // Always return success to prevent email enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return genericResponse;
    }

    // Rate limiting: Check recent attempts
    const recentTokens = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });

    if (recentTokens >= MAX_ATTEMPTS) {
      logger.warn("Rate limit exceeded for password reset", { email });
      return genericResponse;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Build reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Send email using EmailService (uses Ethereal in dev with preview URLs)
    await EmailService.sendPasswordResetEmail(user.email, user.firstName, resetLink);

    logger.info("Password reset email queued", { email, userId: user.id });

    return genericResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    logger.error("Forgot password error", { error, endpoint: "POST /api/auth/forgot-password" });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
