import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isAdmin } from "@/lib";
import { z } from "zod/v4";

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  fiscalYearStart: z.number().min(1).max(12).optional(),
  workingDaysPerWeek: z.number().min(1).max(7).optional(),
  permissions: z.record(z.string(), z.unknown()).optional(),
  leavePolicy: z.record(z.string(), z.unknown()).optional(),
  defaultLeaveAllocation: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let settings = await prisma.organizationSettings.findFirst();

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.organizationSettings.create({
        data: {
          name: "My Organization",
          fiscalYearStart: 1,
          workingDaysPerWeek: 5,
        },
      });
    }

    // Extract leavePolicy from defaultLeaveAllocation for easier access
    const defaultLeaveAlloc = settings.defaultLeaveAllocation as Record<string, unknown> || {};
    const responseSettings = {
      ...settings,
      leavePolicy: defaultLeaveAlloc.leavePolicy || null,
    };

    return NextResponse.json({
      success: true,
      data: { settings: responseSettings },
    });
  } catch (error) {
    console.error("Get organization settings error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // HR can only update leavePolicy, Admin can update everything
    const isHROrAbove = ["ADMIN", "HR"].includes(currentUser.role);
    const isOnlyLeavePolicy = Object.keys(body).every(k => k === "leavePolicy");

    if (!isAdmin(currentUser.role) && !(isHROrAbove && isOnlyLeavePolicy)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin only" },
        { status: 403 }
      );
    }

    const data = updateOrgSchema.parse(body);

    let settings = await prisma.organizationSettings.findFirst();

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl === "" ? null : data.logoUrl;
    if (data.fiscalYearStart !== undefined) updateData.fiscalYearStart = data.fiscalYearStart;
    if (data.workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = data.workingDaysPerWeek;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;

    // Handle leavePolicy - store it in defaultLeaveAllocation JSON
    if (data.leavePolicy !== undefined) {
      const currentSettings = settings?.defaultLeaveAllocation as Record<string, unknown> || {};
      updateData.defaultLeaveAllocation = {
        ...currentSettings,
        leavePolicy: data.leavePolicy,
      };
    }
    if (data.defaultLeaveAllocation !== undefined) {
      updateData.defaultLeaveAllocation = data.defaultLeaveAllocation;
    }

    if (!settings) {
      settings = await prisma.organizationSettings.create({
        data: {
          name: (updateData.name as string) || "My Organization",
          logoUrl: updateData.logoUrl as string | null,
          fiscalYearStart: (updateData.fiscalYearStart as number) || 1,
          workingDaysPerWeek: (updateData.workingDaysPerWeek as number) || 5,
          permissions: updateData.permissions as object,
        },
      });
    } else {
      settings = await prisma.organizationSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update organization settings error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
