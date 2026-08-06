import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, prisma } from "@/lib";
import { logger } from "@/lib/logger";
import { ALL_PERMISSIONS, can, invalidateRoleCache } from "@/lib/rbac";
import { z } from "@/lib/validation";

const updateRoleSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(200).optional().nullable(),
  rank: z.number().int().min(0).max(100).optional(),
  color: z.enum(["gray", "blue", "green", "purple", "orange", "red"]).optional(),
  isDefault: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "SETTINGS_EDIT"))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = updateRoleSchema.parse(await request.json());

    const role = await prisma.userRole.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    /* System roles keep their identity — their permissions are editable, but a
       company cannot rename or re-rank the roles the app itself reasons about. */
    if (role.isSystem && (data.name !== undefined || data.rank !== undefined)) {
      return NextResponse.json(
        { success: false, error: `"${role.name}" is a built-in role: its name and rank are fixed` },
        { status: 400 }
      );
    }

    /* Admin must keep full access, or the next save could lock everyone out. */
    if (role.key === "ADMIN" && data.permissions) {
      const missing = ALL_PERMISSIONS.filter((p) => !data.permissions!.includes(p));
      if (missing.length) {
        return NextResponse.json(
          { success: false, error: "Admin must keep every permission" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.userRole.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      if (data.permissions) {
        const granted = data.permissions.filter((p) => ALL_PERMISSIONS.includes(p));
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (granted.length) {
          await tx.rolePermission.createMany({
            data: granted.map((permission) => ({ roleId: id, permission })),
          });
        }
      }
      return tx.userRole.update({
        where: { id },
        data: {
          name: data.name ?? undefined,
          description: data.description === undefined ? undefined : data.description,
          rank: data.rank ?? undefined,
          color: data.color ?? undefined,
          isDefault: data.isDefault ?? undefined,
        },
        include: { permissions: { select: { permission: true } } },
      });
    });

    invalidateRoleCache();
    return NextResponse.json({ success: true, data: { role: updated } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update role error", { error, endpoint: "PATCH /api/roles/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "SETTINGS_EDIT"))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const role = await prisma.userRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }
    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: `"${role.name}" is a built-in role and cannot be deleted` },
        { status: 400 }
      );
    }
    if (role._count.users > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${role._count.users} employee(s) still have this role — move them first`,
        },
        { status: 400 }
      );
    }

    await prisma.userRole.delete({ where: { id } });
    invalidateRoleCache();
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    logger.error("Delete role error", { error, endpoint: "DELETE /api/roles/[id]" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
