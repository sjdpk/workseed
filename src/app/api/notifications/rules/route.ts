import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import { createAuditLog, getRequestMeta } from "@/lib/audit";
import { getDefaultRecipientConfig } from "@/lib/notifications";

const ruleCreateSchema = z.object({
  type: z.string().min(1, "Type is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  recipientConfig: z.object({
    notifyRequester: z.boolean().optional(),
    notifyManager: z.boolean().optional(),
    notifyTeamLead: z.boolean().optional(),
    notifyDepartmentHead: z.boolean().optional(),
    notifyHR: z.boolean().optional(),
    notifyAdmin: z.boolean().optional(),
    customRecipients: z.array(z.string()).optional(),
    roleRecipients: z.array(z.string()).optional(),
  }),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/notifications/rules - List all notification rules
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_RULE_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const rules = await prisma.notificationRule.findMany({
      orderBy: { type: "asc" },
    });

    return NextResponse.json({ success: true, data: { rules } });
  } catch (error) {
    logger.error("Get notification rules error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch rules" }, { status: 500 });
  }
}

// POST /api/notifications/rules - Create a new notification rule
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_RULE_EDIT")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = ruleCreateSchema.parse(body);

    // Check if rule for this type already exists
    const existing = await prisma.notificationRule.findUnique({
      where: { type: data.type as any },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A rule for this notification type already exists" },
        { status: 400 }
      );
    }

    const rule = await prisma.notificationRule.create({
      data: {
        type: data.type as any,
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
      action: "CREATE",
      entity: "NOTIFICATION_RULE",
      entityId: rule.id,
      details: { type: rule.type, name: rule.name },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { rule } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Create notification rule error", { error });
    return NextResponse.json({ success: false, error: "Failed to create rule" }, { status: 500 });
  }
}
