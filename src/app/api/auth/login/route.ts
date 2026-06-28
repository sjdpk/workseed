import { NextRequest, NextResponse } from "next/server";
import { prisma, verifyPassword, createToken, createAuditLog, getRequestMeta } from "@/lib";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "@/lib/validation";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Brute-force protection: max attempts per IP per window.
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    const limit = rateLimit(`login:${ipAddress || "unknown"}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.allowed) {
      logger.warn("Login rate limit exceeded", { ipAddress });
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    logger.info("Login attempt", { email: body.email });

    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      logger.warn("Login failed - user not found", { email });
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Your account is not active" },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      logger.warn("Login failed - invalid password", { email });
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    logger.info("Login successful", { email, userId: user.id });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          employeeId: user.employeeId,
          branch: user.branch,
        },
        token, // Return token for cross-origin/mobile clients
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      entity: "USER",
      entityId: user.id,
      details: { email: user.email },
      ipAddress,
      userAgent,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Login error", { error, endpoint: "POST /api/auth/login" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
