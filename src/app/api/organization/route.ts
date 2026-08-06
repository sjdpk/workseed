import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";
import { can } from "@/lib/rbac";
import { currentFiscalYear, normalizeFiscalYearConfig } from "@/lib/fiscal-year";
import { logger } from "@/lib/logger";
import { isValidTimeZone, normalizeTimeZone, todayInZone } from "@/lib/time";
import { z } from "@/lib/validation";

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  timezone: z
    .string()
    .refine(isValidTimeZone, { message: "Unknown timezone — use an IANA name like Asia/Kathmandu" })
    .optional(),
  fiscalYearStart: z.number().min(1).max(12).optional(),
  fiscalYearStartDay: z.number().min(1).max(31).optional(),
  workingDaysPerWeek: z.number().min(1).max(7).optional(),
  permissions: z.record(z.string(), z.unknown()).optional(),
  homepage: z.record(z.string(), z.unknown()).optional(),
  leavePolicy: z.record(z.string(), z.unknown()).optional(),
  defaultLeaveAllocation: z.record(z.string(), z.unknown()).optional(),
  theme: z
    .object({
      accentColor: z.enum(["gray", "blue", "green", "purple", "orange", "red"]).optional(),
      darkMode: z.enum(["system", "light", "dark"]).optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.organizationSettings.findFirst();

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.organizationSettings.create({
        data: {
          name: "My Organization",
          fiscalYearStart: 1,
          fiscalYearStartDay: 1,
          workingDaysPerWeek: 5,
        },
      });
    }

    // Extract leavePolicy from defaultLeaveAllocation for easier access
    const defaultLeaveAlloc = (settings.defaultLeaveAllocation as Record<string, unknown>) || {};
    const permissionsData = (settings.permissions as Record<string, unknown>) || {};
    // the running fiscal year travels with the settings so every screen shows
    // the same answer to "which year are we in"
    const fiscalConfig = normalizeFiscalYearConfig({
      startMonth: settings.fiscalYearStart,
      startDay: settings.fiscalYearStartDay,
    });
    // the fiscal year is resolved in the company timezone, so "which year are we
    // in" cannot change with the server's location
    const timezone = normalizeTimeZone(settings.timezone);
    const fiscalYear = currentFiscalYear(fiscalConfig, new Date(), timezone);
    const responseSettings = {
      ...settings,
      leavePolicy: defaultLeaveAlloc.leavePolicy || null,
      theme: permissionsData.theme || null,
      timezone,
      today: todayInZone(timezone),
      fiscalYear: {
        year: fiscalYear.year,
        label: fiscalYear.label,
        start: fiscalYear.start,
        end: fiscalYear.end,
        resetsOn: fiscalYear.resetsOn,
      },
    };

    return NextResponse.json({
      success: true,
      data: { settings: responseSettings },
    });
  } catch (error) {
    logger.error("Get organization settings error", { error, endpoint: "GET /api/organization" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    /* Full settings need SETTINGS_EDIT; the leave policy alone is allowed to
       anyone who can edit leave types, which is how HR used to get in. */
    const isOnlyLeavePolicy = Object.keys(body).every((k) => k === "leavePolicy");
    const mayEditSettings = await can(currentUser, "SETTINGS_EDIT");
    const mayEditLeavePolicy = isOnlyLeavePolicy && (await can(currentUser, "LEAVE_TYPE_EDIT"));

    if (!mayEditSettings && !mayEditLeavePolicy) {
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
    if (data.timezone !== undefined) updateData.timezone = normalizeTimeZone(data.timezone);
    if (data.fiscalYearStart !== undefined) updateData.fiscalYearStart = data.fiscalYearStart;
    if (data.fiscalYearStartDay !== undefined)
      updateData.fiscalYearStartDay = data.fiscalYearStartDay;
    if (data.workingDaysPerWeek !== undefined)
      updateData.workingDaysPerWeek = data.workingDaysPerWeek;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;
    // Home page content — admin only, already enforced by the role check above
    if (data.homepage !== undefined) updateData.homepage = data.homepage;

    // Handle theme - store it in permissions JSON
    if (data.theme !== undefined) {
      const currentPermissions = (settings?.permissions as Record<string, unknown>) || {};
      updateData.permissions = {
        ...currentPermissions,
        theme: data.theme,
      };
    }

    // Handle leavePolicy - store it in defaultLeaveAllocation JSON
    if (data.leavePolicy !== undefined) {
      const currentSettings = (settings?.defaultLeaveAllocation as Record<string, unknown>) || {};
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
          timezone: (updateData.timezone as string) || "UTC",
          fiscalYearStart: (updateData.fiscalYearStart as number) || 1,
          fiscalYearStartDay: (updateData.fiscalYearStartDay as number) || 1,
          workingDaysPerWeek: (updateData.workingDaysPerWeek as number) || 5,
          permissions: updateData.permissions as object,
          homepage: updateData.homepage as object,
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
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update organization settings error", {
      error,
      endpoint: "PATCH /api/organization",
    });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
