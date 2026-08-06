import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib";
import { permissionsFor, resolveRole } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const [permissions, role] = await Promise.all([permissionsFor(user), resolveRole(user)]);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          roleName: role?.name ?? user.role,
          roleRank: role?.rank ?? 0,
          roleColor: role?.color ?? null,
          permissions,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
