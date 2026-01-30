import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isAdmin } from "@/lib";
import { z } from "zod/v4";

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  fiscalYearStart: z.number().min(1).max(12).optional(),
  workingDaysPerWeek: z.number().min(1).max(7).optional(),
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

    return NextResponse.json({
      success: true,
      data: { settings },
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
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateOrgSchema.parse(body);

    let settings = await prisma.organizationSettings.findFirst();

    // Convert empty logoUrl to null
    const updateData = {
      ...data,
      logoUrl: data.logoUrl === "" ? null : data.logoUrl,
    };

    if (!settings) {
      settings = await prisma.organizationSettings.create({
        data: {
          name: updateData.name || "My Organization",
          logoUrl: updateData.logoUrl,
          fiscalYearStart: updateData.fiscalYearStart || 1,
          workingDaysPerWeek: updateData.workingDaysPerWeek || 5,
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
