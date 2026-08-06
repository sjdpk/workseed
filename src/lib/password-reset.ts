/**
 * Password reset and invitation links.
 *
 * Two properties matter here:
 *
 *   1. **Only a hash is stored.** The raw token exists in the email and nowhere
 *      else, so a leaked `password_reset_tokens` table cannot be used to take over
 *      an account — the rows are useless without the original link.
 *   2. **A link is single-use and short-lived**, and issuing a new one invalidates
 *      the ones before it, so an old email in an inbox stops working.
 *
 * Nobody — not even an admin — ever sees or sets an employee's password through
 * this path: the employee chooses it themselves at the end of the link.
 */
import crypto from "crypto";
import { prisma } from "./prisma";

/** An invite gives a new joiner time to act; a reset is deliberately brief. */
export const INVITE_TTL_HOURS = 72;
export const RESET_TTL_HOURS = 1;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a link token for a user and returns the RAW token — the only time it
 * exists in plaintext. Any previous unused token for that user is burned.
 */
export async function createResetToken(
  userId: string,
  { hours = RESET_TTL_HOURS }: { hours?: number } = {}
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.$transaction([
    // one live link per person: a fresh request retires the older ones
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, token: hashToken(token), expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

export interface TokenCheck {
  valid: boolean;
  /** Present only when valid. */
  userId?: string;
  reason?: "unknown" | "used" | "expired";
}

/** Looks a raw token up by its hash without consuming it. */
export async function checkResetToken(token: string): Promise<TokenCheck> {
  if (!token) return { valid: false, reason: "unknown" };
  const row = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!row) return { valid: false, reason: "unknown" };
  if (row.usedAt) return { valid: false, reason: "used" };
  if (row.expiresAt < new Date()) return { valid: false, reason: "expired" };
  return { valid: true, userId: row.userId };
}

/**
 * Marks the token used and returns whose account it belongs to. Marking and the
 * password write happen in one transaction at the call site, so a failed write
 * cannot burn a link.
 */
export async function consumeResetToken(token: string) {
  const row = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });
  if (!row) return { ok: false as const, reason: "unknown" as const };
  if (row.usedAt) return { ok: false as const, reason: "used" as const };
  if (row.expiresAt < new Date()) return { ok: false as const, reason: "expired" as const };
  return { ok: true as const, row };
}

/** The link that goes in the email. */
export function resetLink(baseUrl: string, token: string): string {
  return `${baseUrl}/reset-password?token=${token}`;
}
