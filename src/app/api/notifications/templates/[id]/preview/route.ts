import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { renderTemplate } from "@/lib/notifications";

// POST /api/notifications/templates/[id]/preview - Preview a template with sample data
export async function POST(
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

    // Get sample data from request body or use defaults
    const body = await request.json().catch(() => ({}));
    const sampleVariables = body.variables || {};

    // Build default sample variables based on template type
    const defaultSampleVariables: Record<string, string | number> = {
      // Common
      recipientName: "John Doe",
      recipientEmail: "john.doe@example.com",
      employeeName: "John Doe",

      // Leave related
      leaveType: "Annual Leave",
      startDate: "2024-03-15",
      endDate: "2024-03-20",
      days: 5,
      reason: "Family vacation",
      approverName: "Jane Smith",
      rejectionReason: "Team capacity constraints during this period",

      // Request related
      requestType: "Asset",
      subject: "Request for new laptop",
      response: "Your request has been processed",

      // Announcement related
      typeLabel: "Important",
      title: "Company Update",
      preview: "This is a preview of the announcement content...",
      publishedBy: "HR Department",

      // Birthday/Anniversary
      birthdayPerson: "John Doe",
      department: "Engineering",
      years: 5,

      // Asset related
      assetName: "MacBook Pro 14\"",
      assetTag: "LAP-001",
      category: "Laptop",
      assignedBy: "IT Admin",
      returnedBy: "John Doe",
      condition: "Good",

      // Welcome email
      email: "john.doe@example.com",
      employeeId: "EMP001",

      // Password reset
      resetLink: "https://example.com/reset?token=sample",

      // Appreciation
      senderName: "Jane Smith",
      message: "Great job on the project! Your dedication and hard work really made a difference.",

      // Custom
      content: "<p>This is custom email content.</p>",
    };

    const mergedVariables = {
      ...defaultSampleVariables,
      ...sampleVariables,
    };

    const rendered = renderTemplate(template, mergedVariables);

    return NextResponse.json({
      success: true,
      data: {
        subject: rendered.subject,
        html: rendered.html,
        availableVariables: template.variables || {},
      },
    });
  } catch (error) {
    logger.error("Preview template error", { error });
    return NextResponse.json({ success: false, error: "Failed to preview template" }, { status: 500 });
  }
}
