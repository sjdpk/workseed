import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";
import type { NotificationType } from "@prisma/client";

const preferencesUpdateSchema = z.object({
  preferences: z.array(
    z.object({
      type: z.string(),
      emailEnabled: z.boolean(),
    })
  ),
});

// GET /api/notifications/preferences - Get current user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // If userId is provided, check if user has permission to view others' preferences
    let targetUserId = user.id;
    if (userId && userId !== user.id) {
      if (!hasPermission(user.role, "NOTIFICATION_LOG_VIEW")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      targetUserId = userId;
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: targetUserId },
      orderBy: { type: "asc" },
    });

    // Get all notification types
    const allTypes: NotificationType[] = [
      "LEAVE_REQUEST_SUBMITTED",
      "LEAVE_REQUEST_APPROVED",
      "LEAVE_REQUEST_REJECTED",
      "LEAVE_REQUEST_CANCELLED",
      "LEAVE_PENDING_APPROVAL",
      "REQUEST_SUBMITTED",
      "REQUEST_APPROVED",
      "REQUEST_REJECTED",
      "ANNOUNCEMENT_PUBLISHED",
      "BIRTHDAY_REMINDER",
      "WORK_ANNIVERSARY",
      "ASSET_ASSIGNED",
      "ASSET_RETURNED",
      "WELCOME_EMAIL",
      "PASSWORD_RESET",
      "APPRECIATION",
      "CUSTOM",
    ];

    // Build full preferences list (including defaults for missing types)
    const fullPreferences = allTypes.map((type) => {
      const existing = preferences.find((p) => p.type === type);
      return {
        type,
        emailEnabled: existing?.emailEnabled ?? true, // Default to enabled
      };
    });

    return NextResponse.json({
      success: true,
      data: { preferences: fullPreferences },
    });
  } catch (error) {
    logger.error("Get notification preferences error", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PUT /api/notifications/preferences - Update current user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = preferencesUpdateSchema.parse(body);

    // Upsert each preference
    const results = await Promise.all(
      data.preferences.map(async (pref) => {
        return prisma.notificationPreference.upsert({
          where: {
            userId_type: {
              userId: user.id,
              type: pref.type as NotificationType,
            },
          },
          update: {
            emailEnabled: pref.emailEnabled,
          },
          create: {
            userId: user.id,
            type: pref.type as NotificationType,
            emailEnabled: pref.emailEnabled,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: { updated: results.length },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Update notification preferences error", { error });
    return NextResponse.json({ success: false, error: "Failed to update preferences" }, { status: 500 });
  }
}
