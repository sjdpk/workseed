import { NextRequest, NextResponse } from "next/server";
import { prisma, hashPassword, getCurrentUser, isHROrAbove, createAuditLog, getRequestMeta } from "@/lib";
import { z } from "zod/v4";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  profilePicture: z.string().url().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  // Social links
  linkedIn: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  // Personal info
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  joiningDate: z.string().optional(),
  designation: z.string().optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
});

async function generateEmployeeId(): Promise<string> {
  const count = await prisma.user.count();
  const paddedNumber = String(count + 1).padStart(5, "0");
  return `EMP${paddedNumber}`;
}

// Allocate default leaves for new user
async function allocateDefaultLeaves(userId: string) {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  const currentYear = new Date().getFullYear();

  for (const leaveType of leaveTypes) {
    await prisma.leaveAllocation.create({
      data: {
        userId,
        leaveTypeId: leaveType.id,
        year: currentYear,
        allocated: leaveType.defaultDays,
      },
    });
  }
}

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
    const teamId = searchParams.get("teamId");
    const departmentId = searchParams.get("departmentId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" as const } },
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { employeeId: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

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
          profilePicture: true,
          role: true,
          status: true,
          designation: true,
          employmentType: true,
          joiningDate: true,
          linkedIn: true,
          twitter: true,
          github: true,
          website: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
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
        employeeId,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        profilePicture: data.profilePicture || null,
        role: data.role,
        status: data.status || "ACTIVE",
        linkedIn: data.linkedIn || null,
        twitter: data.twitter || null,
        github: data.github || null,
        website: data.website || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        nationality: data.nationality,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        emergencyContact: data.emergencyContact,
        emergencyContactPhone: data.emergencyContactPhone,
        employmentType: data.employmentType || "FULL_TIME",
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
        designation: data.designation,
        branchId: data.branchId,
        departmentId: data.departmentId,
        teamId: data.teamId,
        managerId: data.managerId,
        createdBy: currentUser.id,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
        status: true,
      },
    });

    // Allocate default leaves
    await allocateDefaultLeaves(user.id);

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: currentUser.id,
      action: "CREATE",
      entity: "USER",
      entityId: user.id,
      details: { email: user.email, employeeId: user.employeeId, role: user.role },
      ipAddress,
      userAgent,
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
