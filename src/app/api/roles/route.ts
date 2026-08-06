import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, prisma } from "@/lib";
import { logger } from "@/lib/logger";
import { ALL_PERMISSIONS, can, invalidateRoleCache } from "@/lib/rbac";
import { z } from "@/lib/validation";

const createRoleSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  rank: z.number().int().min(0).max(100).optional(),
  color: z.enum(["gray", "blue", "green", "purple", "orange", "red"]).optional(),
  isDefault: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

/** Stable slug for a new role; system roles keep their original keys. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "role"
  );
}

/** Anyone signed in may READ the roster — the UI needs it for dropdowns and
 *  badges — but only SETTINGS_EDIT may change it. */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const roles = await prisma.userRole.findMany({
      include: {
        permissions: { select: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { rank: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        roles: roles.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          rank: r.rank,
          color: r.color,
          isSystem: r.isSystem,
          isDefault: r.isDefault,
          userCount: r._count.users,
          permissions: r.permissions.map((p) => p.permission),
        })),
        allPermissions: ALL_PERMISSIONS,
      },
    });
  } catch (error) {
    logger.error("List roles error", { error, endpoint: "GET /api/roles" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await can(currentUser, "SETTINGS_EDIT"))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const data = createRoleSchema.parse(await request.json());

    const existing = await prisma.userRole.findFirst({
      where: { OR: [{ name: data.name }, { key: slugify(data.name) }] },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A role with that name already exists" },
        { status: 400 }
      );
    }

    const granted = (data.permissions ?? []).filter((p) => ALL_PERMISSIONS.includes(p));

    const role = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.userRole.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.userRole.create({
        data: {
          key: slugify(data.name),
          name: data.name,
          description: data.description,
          rank: data.rank ?? 0,
          color: data.color ?? "gray",
          isSystem: false,
          isDefault: data.isDefault ?? false,
          permissions: { create: granted.map((permission) => ({ permission })) },
        },
        include: { permissions: { select: { permission: true } } },
      });
    });

    invalidateRoleCache();
    return NextResponse.json({ success: true, data: { role } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create role error", { error, endpoint: "POST /api/roles" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
