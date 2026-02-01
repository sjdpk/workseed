import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import { createAuditLog, getRequestMeta } from "@/lib/audit";

const templateUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  htmlBody: z.string().min(1).optional(),
  variables: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/notifications/templates/[id] - Get a template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_TEMPLATE_VIEW")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { template } });
  } catch (error) {
    logger.error("Get template error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch template" }, { status: 500 });
  }
}

// PUT /api/notifications/templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_TEMPLATE_EDIT")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = templateUpdateSchema.parse(body);

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        displayName: data.displayName,
        subject: data.subject,
        htmlBody: data.htmlBody,
        variables: data.variables,
        isActive: data.isActive,
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "EMAIL_TEMPLATE",
      entityId: template.id,
      details: { name: template.name, changes: data },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { template } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Update template error", { error });
    return NextResponse.json({ success: false, error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE /api/notifications/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "NOTIFICATION_TEMPLATE_EDIT")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { success: false, error: "System templates cannot be deleted" },
        { status: 400 }
      );
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "EMAIL_TEMPLATE",
      entityId: id,
      details: { name: existing.name, type: existing.type },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { message: "Template deleted" } });
  } catch (error) {
    logger.error("Delete template error", { error });
    return NextResponse.json({ success: false, error: "Failed to delete template" }, { status: 500 });
  }
}
