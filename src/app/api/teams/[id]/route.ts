import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  leadId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { team },
    });
  } catch (error) {
    logger.error("Get team error", { error, endpoint: "GET /api/teams/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateTeamSchema.parse(body);

    // Check if code is unique (if changing)
    if (data.code) {
      const existing = await prisma.team.findFirst({
        where: {
          code: data.code,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Team code already exists" },
          { status: 400 }
        );
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data,
      include: {
        department: {
          select: { id: true, name: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { team },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update team error", { error, endpoint: "PATCH /api/teams/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
