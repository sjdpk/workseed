import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma, hashPassword, getCurrentUser, createAuditLog, getRequestMeta } from "@/lib";
import { getCurrentFiscalYear } from "@/lib/fiscal-year-server";
import { dateOnlyToUtcDate, isDateOnly } from "@/lib/time";
import { can, legacyRoleFor, resolveRole } from "@/lib/rbac";
import { EmailService } from "@/lib/email-service";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createResetToken, INVITE_TTL_HOURS, resetLink } from "@/lib/password-reset";
import { z } from "@/lib/validation";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  /* Optional: with `sendInvite` the employee sets their own password from an
     emailed link, so nobody — including the admin creating the account — ever
     knows it. */
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  sendInvite: z.boolean().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  employeeId: z.string().min(1).optional(), // Optional - auto-generated if not provided
  deviceUserId: z.string().min(1).optional(), // Optional - biometric/RFID device PIN
  phone: z.string().optional(),
  profilePicture: z.string().url().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]).optional(),
  roleId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  // Social links
  linkedIn: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  // Personal info
  dateOfBirth: z.string().refine(isDateOnly, "dateOfBirth must be YYYY-MM-DD").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        relation: z.string().optional(),
        phone: z.string().optional(),
        altPhone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        notes: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  joiningDate: z.string().refine(isDateOnly, "joiningDate must be YYYY-MM-DD").optional(),
  designation: z.string().optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
});

/**
 * Next employee ID, derived from the highest one already issued rather than from
 * the row count — counting collides the moment anybody is deleted, or an ID was
 * set by hand. Retries on the unique constraint in case two creates race.
 */
async function generateEmployeeId(): Promise<string> {
  const latest = await prisma.user.findMany({
    where: { employeeId: { startsWith: "EMP" } },
    select: { employeeId: true },
    orderBy: { employeeId: "desc" },
    take: 1,
  });
  const highest = latest[0] ? parseInt(latest[0].employeeId.replace(/\D/g, ""), 10) : 0;
  return `EMP${String((Number.isNaN(highest) ? 0 : highest) + 1).padStart(5, "0")}`;
}

// Allocate default leaves for new user
async function allocateDefaultLeaves(userId: string) {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  const { year: currentYear } = await getCurrentFiscalYear();

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
    if (!currentUser || !(await can(currentUser, "USER_VIEW_ALL"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const teamId = searchParams.get("teamId");
    const departmentId = searchParams.get("departmentId");
    const role = searchParams.get("role");
    const status = searchParams.get("status");

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

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
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
    logger.error("List users error", { error, endpoint: "GET /api/users" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "USER_CREATE"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = createUserSchema.parse(body);

    const targetRole = await resolveRole({ roleId: data.roleId, role: data.role });
    const actorRole = await resolveRole(currentUser);
    if (targetRole && actorRole && targetRole.rank > actorRole.rank) {
      return NextResponse.json(
        {
          success: false,
          error: `You cannot give someone the ${targetRole.name} role — it outranks yours`,
        },
        { status: 403 }
      );
    }
    if (!targetRole) {
      return NextResponse.json(
        { success: false, error: "Pick a role for this employee" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 400 });
    }

    // Check if custom employee ID is provided and unique
    let employeeId: string;
    if (data.employeeId) {
      const existingEmployeeId = await prisma.user.findUnique({
        where: { employeeId: data.employeeId },
      });
      if (existingEmployeeId) {
        return NextResponse.json(
          { success: false, error: "Employee ID already exists" },
          { status: 400 }
        );
      }
      employeeId = data.employeeId;
    } else {
      employeeId = await generateEmployeeId();
    }

    // Check device PIN is unique if provided
    if (data.deviceUserId) {
      const existingDeviceUser = await prisma.user.findFirst({
        where: { deviceUserId: data.deviceUserId },
      });
      if (existingDeviceUser) {
        return NextResponse.json(
          { success: false, error: "Device User ID already exists" },
          { status: 400 }
        );
      }
    }

    /* Invited accounts get a random unguessable password that is immediately
       unusable — the only way in is the emailed link. */
    const sendInvite = data.sendInvite ?? !data.password;
    if (!sendInvite && !data.password) {
      return NextResponse.json(
        { success: false, error: "Set a password or choose to email an invite" },
        { status: 400 }
      );
    }
    const hashedPassword = await hashPassword(
      data.password ?? crypto.randomBytes(48).toString("hex")
    );

    const user = await prisma.user.create({
      data: {
        employeeId,
        deviceUserId: data.deviceUserId || null,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        profilePicture: data.profilePicture || null,
        role: legacyRoleFor(targetRole),
        roleId: targetRole.id,
        status: data.status || "ACTIVE",
        linkedIn: data.linkedIn || null,
        twitter: data.twitter || null,
        github: data.github || null,
        website: data.website || null,
        dateOfBirth: data.dateOfBirth ? dateOnlyToUtcDate(data.dateOfBirth) : undefined,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        nationality: data.nationality,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        emergencyContacts: data.emergencyContacts?.length
          ? {
              create: data.emergencyContacts
                .filter((c) => c.name.trim())
                .map((c, i) => ({
                  name: c.name.trim(),
                  relation: c.relation || null,
                  phone: c.phone || null,
                  altPhone: c.altPhone || null,
                  email: c.email || null,
                  address: c.address || null,
                  notes: c.notes || null,
                  isPrimary: i === 0,
                  sortOrder: i,
                })),
            }
          : undefined,
        employmentType: data.employmentType || "FULL_TIME",
        joiningDate: data.joiningDate ? dateOnlyToUtcDate(data.joiningDate) : undefined,
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
      details: {
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        invited: sendInvite,
      },
      ipAddress,
      userAgent,
    });

    /* The invite is sent after the account exists, and its failure is reported
       rather than swallowed — an admin needs to know whether to resend. */
    let invite: { sent: boolean; error?: string } | undefined;
    if (sendInvite) {
      try {
        const { token } = await createResetToken(user.id, { hours: INVITE_TTL_HOURS });
        await EmailService.sendInviteEmail(
          user.email,
          user.firstName,
          resetLink(env.NEXT_PUBLIC_APP_URL, token),
          INVITE_TTL_HOURS
        );
        invite = { sent: true };
      } catch (error) {
        logger.error("Invite email failed", { error, userId: user.id });
        invite = { sent: false, error: "Account created, but the invite email could not be sent" };
      }
    }

    return NextResponse.json({ success: true, data: { user, invite } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create user error", { error, endpoint: "POST /api/users" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
