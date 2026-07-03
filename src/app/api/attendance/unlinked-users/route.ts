import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove } from "@/lib";
import { logger } from "@/lib/logger";

/**
 * List active employees that are NOT yet linked to any device (deviceUserId is
 * null) — the candidates for linking a device enrollment to an existing person
 * instead of creating a duplicate. Optional ?search= filters by name/employeeId.
 *
 * GET /api/attendance/unlinked-users?search=jo
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isHROrAbove(currentUser.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const search = new URL(request.url).searchParams.get("search")?.trim() || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deviceUserId: null, status: "ACTIVE" };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, employeeId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 25,
    });

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          employeeId: u.employeeId,
        })),
      },
    });
  } catch (error) {
    logger.error("Unlinked users endpoint error", { error });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
