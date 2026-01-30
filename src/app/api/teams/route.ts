import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { z } from "zod/v4";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  code: z.string().min(1, "Team code is required"),
  description: z.string().optional(),
  departmentId: z.string().uuid("Invalid department"),
  leadId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    const where: { isActive: boolean; departmentId?: string } = { isActive: true };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { teams },
    });
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createTeamSchema.parse(body);

    const existing = await prisma.team.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Team code already exists" },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data,
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: { team } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create team error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
