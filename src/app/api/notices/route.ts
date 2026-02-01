import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { sendAnnouncementNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const createNoticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["GENERAL", "IMPORTANT", "URGENT"]).optional(),
  expiresAt: z.string().optional(),
});

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // For employees, only show active and non-expired notices
    const whereClause = isHROrAbove(currentUser.role)
      ? {}
      : {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        };

    const notices = await prisma.notice.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: [
        { type: "desc" }, // URGENT first
        { publishedAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: { notices },
    });
  } catch (error) {
    logger.error("Get notices error", { error, endpoint: "GET /api/notices" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - HR or Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createNoticeSchema.parse(body);

    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || "GENERAL",
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdById: currentUser.id,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Send notification via notification service (non-blocking)
    const noticeTypeValue = data.type || "GENERAL";
    if (noticeTypeValue === "IMPORTANT" || noticeTypeValue === "URGENT") {
      sendAnnouncementNotification({
        noticeId: notice.id,
        title: data.title,
        content: data.content,
        type: noticeTypeValue,
        publishedBy: `${notice.createdBy.firstName} ${notice.createdBy.lastName}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: { notice },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create notice error", { error, endpoint: "POST /api/notices" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
