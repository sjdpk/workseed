import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib";

export async function GET(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Admin and HR should use the main Users page
    const isHROrAbove = ["ADMIN", "HR"].includes(currentUser.role);
    if (isHROrAbove) {
      return NextResponse.json(
        { success: false, error: "Use Users page for admin access" },
        { status: 403 }
      );
    }

    // Get organization permissions
    const orgSettings = await prisma.organizationSettings.findFirst();
    const permissions = (orgSettings?.permissions as Record<string, boolean>) || {};

    // Default permissions if not set
    const canViewTeam = permissions.employeesCanViewTeamMembers ?? true;
    const canViewDepartment = permissions.employeesCanViewDepartmentMembers ?? false;
    const canViewAll = permissions.employeesCanViewAllEmployees ?? false;

    const whereClause: Record<string, unknown> = {
      id: { not: currentUser.id }, // Exclude self
    };

    let scope = "none";

    // Determine the best scope based on permissions and user's assignments
    if (canViewAll) {
      // Show all employees
      scope = "all";
    } else if (canViewDepartment && currentUser.departmentId) {
      // Show department members
      whereClause.departmentId = currentUser.departmentId;
      scope = "department";
    } else if (canViewTeam && currentUser.teamId) {
      // Show team members
      whereClause.teamId = currentUser.teamId;
      scope = "team";
    } else {
      // No permission or no team/department assigned
      return NextResponse.json({
        success: true,
        data: { users: [], scope: "none" },
      });
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        linkedIn: true,
        role: true,
        designation: true,
        phone: true,
        department: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
        branch: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: { users, scope },
    });
  } catch (error) {
    console.error("Get directory error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
