import { NextRequest, NextResponse } from "next/server";
import { prisma, hashPassword, getCurrentUser, isHROrAbove } from "@/lib";
import { z } from "zod/v4";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]),
  branchId: z.string().uuid().optional(),
});

// Generate employee ID
async function generateEmployeeId(): Promise<string> {
  const count = await prisma.user.count();
  const paddedNumber = String(count + 1).padStart(5, "0");
  return `EMP${paddedNumber}`;
}

// GET - List users
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employeeId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          branch: {
            select: { id: true, name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Only ADMIN can create ADMIN or HR users
    const body = await request.json();
    const data = createUserSchema.parse(body);

    if (
      (data.role === "ADMIN" || data.role === "HR") &&
      currentUser.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { success: false, error: "Only admins can create admin or HR users" },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(data.password);
    const employeeId = await generateEmployeeId();

    const user = await prisma.user.create({
      data: {
        ...data,
        employeeId,
        password: hashedPassword,
        createdBy: currentUser.id,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: { user } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
