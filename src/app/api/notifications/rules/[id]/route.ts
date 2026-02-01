import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import { createAuditLog, getRequestMeta } from "@/lib/audit";

const ruleUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  recipientConfig: z
    .object({
      notifyRequester: z.boolean().optional(),
      notifyManager: z.boolean().optional(),
      notifyTeamLead: z.boolean().optional(),
      notifyDepartmentHead: z.boolean().optional(),
      notifyHR: z.boolean().optional(),
      notifyAdmin: z.boolean().optional(),
      customRecipients: z.array(z.string()).optional(),
      roleRecipients: z.array(z.string()).optional(),
    })
    .optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/notifications/rules/[id] - Get a rule by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_RULE_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const rule = await prisma.notificationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { rule } });
  } catch (error) {
    logger.error("Get notification rule error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch rule" }, { status: 500 });
  }
}

// PUT /api/notifications/rules/[id] - Update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_RULE_EDIT")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.notificationRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = ruleUpdateSchema.parse(body);

    const rule = await prisma.notificationRule.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        recipientConfig: data.recipientConfig as any,
        conditions: data.conditions as any,
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "NOTIFICATION_RULE",
      entityId: rule.id,
      details: { type: rule.type, changes: data },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { rule } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Update notification rule error", { error });
    return NextResponse.json({ success: false, error: "Failed to update rule" }, { status: 500 });
  }
}

// DELETE /api/notifications/rules/[id] - Delete a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_RULE_EDIT")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.notificationRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Rule not found" }, { status: 404 });
    }

    await prisma.notificationRule.delete({
      where: { id },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "NOTIFICATION_RULE",
      entityId: id,
      details: { type: existing.type, name: existing.name },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { message: "Rule deleted" } });
  } catch (error) {
    logger.error("Delete notification rule error", { error });
    return NextResponse.json({ success: false, error: "Failed to delete rule" }, { status: 500 });
  }
}
