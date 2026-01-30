import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "APPROVE"
  | "REJECT"
  | "CANCEL"
  | "VIEW"
  | "EXPORT";

export type AuditEntity =
  | "USER"
  | "DEPARTMENT"
  | "TEAM"
  | "BRANCH"
  | "LEAVE_REQUEST"
  | "LEAVE_TYPE"
  | "LEAVE_ALLOCATION"
  | "NOTICE"
  | "SETTINGS"
  | "DOCUMENT";

interface AuditLogInput {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    // Don't throw error for audit log failures - just log it
    console.error("Audit log error:", error);
  }
}

// Helper to extract IP and User Agent from request headers
export function getRequestMeta(headers: Headers) {
  return {
    ipAddress: headers.get("x-forwarded-for")?.split(",")[0] || headers.get("x-real-ip") || "unknown",
    userAgent: headers.get("user-agent") || "unknown",
  };
}
