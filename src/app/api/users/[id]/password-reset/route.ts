import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser, getRequestMeta, prisma } from "@/lib";
import { EmailService } from "@/lib/email-service";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createResetToken, INVITE_TTL_HOURS, resetLink } from "@/lib/password-reset";
import { can, outranks } from "@/lib/rbac";

/**
 * Email an employee a link to set a new password.
 *
 * Note what this route deliberately cannot do: it never sets, reveals or returns
 * a password. An admin can help someone locked out without ever learning their
 * credentials, and the action is written to the audit log.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "USER_EDIT"))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, status: true, role: true, roleId: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // nobody may reset an account more senior than their own
    if (target.id !== currentUser.id && (await outranks(target, currentUser))) {
      return NextResponse.json(
        { success: false, error: "That account outranks yours" },
        { status: 403 }
      );
    }

    if (target.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "This account is not active" },
        { status: 400 }
      );
    }

    const { token, expiresAt } = await createResetToken(target.id, { hours: INVITE_TTL_HOURS });
    await EmailService.sendInviteEmail(
      target.email,
      target.firstName,
      resetLink(env.NEXT_PUBLIC_APP_URL, token),
      INVITE_TTL_HOURS
    );

    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "USER",
      entityId: target.id,
      details: { passwordResetLinkSent: true, to: target.email },
      ipAddress,
      userAgent,
    });

    logger.info("Password reset link sent by admin", {
      by: currentUser.id,
      userId: target.id,
    });

    return NextResponse.json({
      success: true,
      data: { sentTo: target.email, expiresAt },
    });
  } catch (error) {
    logger.error("Send password reset link error", {
      error,
      endpoint: "POST /api/users/[id]/password-reset",
    });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
