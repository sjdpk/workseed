import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import { createAuditLog, getRequestMeta } from "@/lib/audit";

const templateCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.string().min(1, "Display name is required"),
  type: z.string().min(1, "Type is required"),
  subject: z.string().min(1, "Subject is required"),
  htmlBody: z.string().min(1, "HTML body is required"),
  variables: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/notifications/templates - List all templates
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_TEMPLATE_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === "true";

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: { templates } });
  } catch (error) {
    logger.error("Get templates error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/notifications/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_TEMPLATE_EDIT")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = templateCreateSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A template with this name already exists" },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        type: data.type as any,
        subject: data.subject,
        htmlBody: data.htmlBody,
        variables: data.variables,
        isActive: data.isActive,
        isSystem: false,
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "EMAIL_TEMPLATE",
      entityId: template.id,
      details: { name: template.name, type: template.type },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { template } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Create template error", { error });
    return NextResponse.json({ success: false, error: "Failed to create template" }, { status: 500 });
  }
}
