import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";
import { z } from "@/lib/validation";

const createBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  code: z.string().min(1, "Branch code is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

// GET - List branches
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { branches },
    });
  } catch (error) {
    logger.error("List branches error", { error, endpoint: "GET /api/branches" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create branch
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createBranchSchema.parse(body);

    // Check if code already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { code: data.code },
    });

    if (existingBranch) {
      return NextResponse.json(
        { success: false, error: "Branch code already exists" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.create({
      data: {
        ...data,
        email: data.email || null,
      },
    });

    return NextResponse.json({ success: true, data: { branch } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create branch error", { error, endpoint: "POST /api/branches" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
