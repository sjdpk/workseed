import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const notice = await prisma.notice.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!notice) {
      return NextResponse.json({ success: false, error: "Notice not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { notice },
    });
  } catch (error) {
    logger.error("Get notice error", { error, endpoint: "GET /api/notices/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

const updateNoticeSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(["GENERAL", "IMPORTANT", "URGENT"]).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateNoticeSchema.parse(body);

    const notice = await prisma.notice.update({
      where: { id },
      data: {
        ...data,
        expiresAt:
          data.expiresAt === null ? null : data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { notice },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update notice error", { error, endpoint: "PATCH /api/notices/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.notice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error("Delete notice error", { error, endpoint: "DELETE /api/notices/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
