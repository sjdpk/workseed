import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, hashPassword, createAuditLog, getRequestMeta } from "@/lib";
import { logger } from "@/lib/logger";
import { can, legacyRoleFor, resolveRole } from "@/lib/rbac";
import { dateOnlyToUtcDate } from "@/lib/time";
import { z } from "@/lib/validation";

const updateUserSchema = z.object({
  employeeId: z.string().min(1).optional(),
  deviceUserId: z.string().optional().nullable(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  profilePicture: z.string().url().optional().nullable().or(z.literal("")),
  linkedIn: z.string().url().optional().nullable().or(z.literal("")),
  twitter: z.string().url().optional().nullable().or(z.literal("")),
  github: z.string().url().optional().nullable().or(z.literal("")),
  website: z.string().url().optional().nullable().or(z.literal("")),
  role: z.enum(["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]).optional(),
  roleId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional().nullable(),
  nationality: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        relation: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        altPhone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        address: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  joiningDate: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  password: z.string().min(8).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        deviceUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        linkedIn: true,
        twitter: true,
        github: true,
        website: true,
        role: true,
        roleId: true,
        roleRecord: { select: { id: true, name: true, key: true, color: true, rank: true } },
        status: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        nationality: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        emergencyContacts: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        },
        employmentType: true,
        joiningDate: true,
        designation: true,
        branchId: true,
        departmentId: true,
        teamId: true,
        managerId: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.id !== currentUser.id && !(await can(currentUser, "USER_VIEW_ALL"))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error("Get user error", { error, endpoint: "GET /api/users/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const isSelf = currentUser.id === id;
    const isHRAdmin = await can(currentUser, "USER_EDIT");

    if (!isSelf && !isHRAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    // Self-editable fields
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture || null;
    if (data.linkedIn !== undefined) updateData.linkedIn = data.linkedIn || null;
    if (data.twitter !== undefined) updateData.twitter = data.twitter || null;
    if (data.github !== undefined) updateData.github = data.github || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.password) updateData.password = await hashPassword(data.password);
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    // Emergency contacts are sent as the full list and replace what is stored,
    // so removing a row in the UI removes it here. Rows without a name are
    // dropped rather than saved blank.
    if (data.emergencyContacts !== undefined) {
      const contacts = data.emergencyContacts.filter((c) => c.name.trim());
      const primaryIndex = contacts.findIndex((c) => c.isPrimary);
      updateData.emergencyContacts = {
        deleteMany: {},
        create: contacts.map((c, i) => ({
          name: c.name.trim(),
          relation: c.relation || null,
          phone: c.phone || null,
          altPhone: c.altPhone || null,
          email: c.email || null,
          address: c.address || null,
          notes: c.notes || null,
          // exactly one primary: the ticked one, else the first row
          isPrimary: primaryIndex === -1 ? i === 0 : i === primaryIndex,
          sortOrder: i,
        })),
      };
    }

    // HR/Admin only fields
    if (isHRAdmin) {
      // Employee ID can be changed by HR/Admin (including for self if admin)
      if (data.employeeId && data.employeeId !== targetUser.employeeId) {
        const existingEmployeeId = await prisma.user.findUnique({
          where: { employeeId: data.employeeId },
        });
        if (existingEmployeeId && existingEmployeeId.id !== id) {
          return NextResponse.json(
            { success: false, error: "Employee ID already exists" },
            { status: 400 }
          );
        }
        updateData.employeeId = data.employeeId;
      }

      // Device PIN (biometric/RFID) — settable/clearable by HR/Admin
      if (data.deviceUserId !== undefined && data.deviceUserId !== targetUser.deviceUserId) {
        if (data.deviceUserId) {
          const existingDeviceUser = await prisma.user.findFirst({
            where: { deviceUserId: data.deviceUserId },
          });
          if (existingDeviceUser && existingDeviceUser.id !== id) {
            return NextResponse.json(
              { success: false, error: "Device User ID already exists" },
              { status: 400 }
            );
          }
        }
        updateData.deviceUserId = data.deviceUserId || null;
      }
    }

    // HR/Admin only fields (not for self)
    if (isHRAdmin && !isSelf) {
      if (data.dateOfBirth !== undefined) {
        updateData.dateOfBirth = data.dateOfBirth ? dateOnlyToUtcDate(data.dateOfBirth) : null;
      }
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus;
      if (data.nationality !== undefined) updateData.nationality = data.nationality;
      if (data.employmentType) updateData.employmentType = data.employmentType;
      if (data.joiningDate !== undefined) {
        updateData.joiningDate = data.joiningDate ? dateOnlyToUtcDate(data.joiningDate) : null;
      }
      if (data.designation !== undefined) updateData.designation = data.designation;
      if (data.branchId !== undefined) updateData.branchId = data.branchId;
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
      if (data.teamId !== undefined) updateData.teamId = data.teamId;
      if (data.managerId !== undefined) updateData.managerId = data.managerId;

      // Role changes
      const requestedRole =
        data.roleId || data.role
          ? await resolveRole({ roleId: data.roleId, role: data.role })
          : null;
      if (requestedRole) {
        const actorRole = await resolveRole(currentUser);
        if (actorRole && requestedRole.rank > actorRole.rank) {
          return NextResponse.json(
            {
              success: false,
              error: `You cannot assign the ${requestedRole.name} role — it outranks yours`,
            },
            { status: 403 }
          );
        }
        updateData.roleId = requestedRole.id;
        updateData.role = legacyRoleFor(requestedRole);
      }

      // Status changes (ADMIN only)
      if (data.status && currentUser.role === "ADMIN") {
        updateData.status = data.status;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        deviceUserId: true,
        emergencyContacts: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        },
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        linkedIn: true,
        twitter: true,
        github: true,
        website: true,
        role: true,
        status: true,
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update user error", { error, endpoint: "PATCH /api/users/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
