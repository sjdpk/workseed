import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isHROrAbove, isManagerOrAbove, createAuditLog, getRequestMeta } from "@/lib";
import { z } from "zod/v4";

const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().min(0.5),
  isHalfDay: z.boolean().default(false),
  halfDayType: z.enum(["FIRST_HALF", "SECOND_HALF"]).optional(),
  reason: z.string().optional(),
});

const updateLeaveRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  rejectionReason: z.string().optional(),
  cancelReason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const pending = searchParams.get("pending"); // For managers to see pending approvals
    const all = searchParams.get("all"); // For authorized roles to see all requests
    const team = searchParams.get("team"); // For employees to see team leaves

    // Get organization permissions
    const orgSettings = await prisma.organizationSettings.findFirst();
    const permissions = (orgSettings?.permissions as Record<string, unknown>) || {};
    const roleAccess = (permissions.roleAccess as Record<string, string[]>) || {};
    const leaveRequestsAccess = roleAccess.leaveRequests || ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"];
    const canViewLeaveRequests = leaveRequestsAccess.includes(currentUser.role);

    // Leave visibility permissions
    const employeesCanViewTeamLeaves = permissions.employeesCanViewTeamLeaves === true;
    const employeesCanViewDepartmentLeaves = permissions.employeesCanViewDepartmentLeaves === true;

    let where: Record<string, unknown> = {};
    let scope = "own"; // Track scope for UI

    if (all === "true" && canViewLeaveRequests) {
      // Hierarchical leave viewing based on role
      if (isHROrAbove(currentUser.role)) {
        // HR/Admin see all leave requests
        where = {};
        scope = "all";
      } else if (currentUser.role === "MANAGER") {
        // Managers see only their direct reports' leaves
        where = {
          user: { managerId: currentUser.id },
        };
        scope = "direct_reports";
      } else if (currentUser.role === "TEAM_LEAD") {
        // Team Leads see their team members' leaves
        if (currentUser.teamId) {
          where = {
            user: { teamId: currentUser.teamId },
          };
          scope = "team";
        } else {
          // If no team, only see direct reports
          where = {
            user: { managerId: currentUser.id },
          };
          scope = "direct_reports";
        }
      }
    } else if (team === "true" && employeesCanViewTeamLeaves && currentUser.teamId) {
      // Employees viewing team leaves (if permission enabled)
      where = {
        user: { teamId: currentUser.teamId },
        status: "APPROVED", // Only show approved leaves to team members
      };
      scope = "team_approved";
    } else if (pending === "true" && isManagerOrAbove(currentUser.role)) {
      // Get pending requests for approval
      if (isHROrAbove(currentUser.role)) {
        where = { status: "PENDING" };
        scope = "all_pending";
      } else if (currentUser.role === "MANAGER") {
        // Manager sees pending from direct reports
        where = {
          status: "PENDING",
          user: { managerId: currentUser.id },
        };
        scope = "direct_reports_pending";
      } else if (currentUser.role === "TEAM_LEAD") {
        // Team Lead sees pending from team members
        if (currentUser.teamId) {
          where = {
            status: "PENDING",
            user: { teamId: currentUser.teamId },
          };
          scope = "team_pending";
        } else {
          where = {
            status: "PENDING",
            user: { managerId: currentUser.id },
          };
          scope = "direct_reports_pending";
        }
      }
    } else if (userId && isHROrAbove(currentUser.role)) {
      where = { userId };
      scope = "specific_user";
    } else {
      where = { userId: currentUser.id };
      scope = "own";
    }

    if (status) {
      where.status = status;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        leaveType: true,
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { leaveRequests, scope },
    });
  } catch (error) {
    console.error("List leave requests error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createLeaveRequestSchema.parse(body);

    // Check leave balance
    const year = new Date(data.startDate).getFullYear();
    const allocation = await prisma.leaveAllocation.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: currentUser.id,
          leaveTypeId: data.leaveTypeId,
          year,
        },
      },
    });

    if (!allocation) {
      return NextResponse.json(
        { success: false, error: "No leave allocation found for this leave type" },
        { status: 400 }
      );
    }

    const balance = allocation.allocated + allocation.carriedOver + allocation.adjusted - allocation.used;

    if (data.days > balance) {
      return NextResponse.json(
        { success: false, error: `Insufficient leave balance. Available: ${balance} days` },
        { status: 400 }
      );
    }

    // Check for overlapping requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: currentUser.id,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: new Date(data.endDate) },
            endDate: { gte: new Date(data.startDate) },
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { success: false, error: "You already have a leave request for these dates" },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: currentUser.id,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: data.days,
        isHalfDay: data.isHalfDay,
        halfDayType: data.halfDayType,
        reason: data.reason,
      },
      include: {
        leaveType: true,
      },
    });

    return NextResponse.json(
      { success: true, data: { leaveRequest } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create leave request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Request ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateLeaveRequestSchema.parse(body);

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Get organization permissions
    const orgSettings = await prisma.organizationSettings.findFirst();
    const permissions = (orgSettings?.permissions as Record<string, unknown>) || {};
    const teamLeadCanApprove = permissions.teamLeadCanApproveLeaves !== false;
    const managerCanApprove = permissions.managerCanApproveLeaves !== false;
    const hrCanApprove = permissions.hrCanApproveLeaves !== false;

    // Check permissions
    const isOwner = leaveRequest.userId === currentUser.id;
    let canApprove = false;

    if (currentUser.role === "ADMIN") {
      canApprove = true;
    } else if (currentUser.role === "HR" && hrCanApprove) {
      canApprove = true;
    } else if (currentUser.role === "MANAGER" && managerCanApprove) {
      canApprove = true;
    } else if (currentUser.role === "TEAM_LEAD" && teamLeadCanApprove) {
      canApprove = true;
    }

    if (data.status === "CANCELLED") {
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: "Only the requester can cancel" },
          { status: 403 }
        );
      }
    } else if (data.status === "APPROVED" || data.status === "REJECTED") {
      if (!canApprove) {
        return NextResponse.json(
          { success: false, error: "Not authorized to approve/reject" },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.status === "APPROVED" || data.status === "REJECTED") {
      updateData.approverId = currentUser.id;
      updateData.approvedAt = new Date();
      if (data.rejectionReason) {
        updateData.rejectionReason = data.rejectionReason;
      }
    }

    if (data.status === "CANCELLED" && data.cancelReason) {
      updateData.cancelReason = data.cancelReason;
    }

    // If approved, update the allocation's used days
    if (data.status === "APPROVED") {
      const year = leaveRequest.startDate.getFullYear();
      await prisma.leaveAllocation.update({
        where: {
          userId_leaveTypeId_year: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
        },
        data: {
          used: { increment: leaveRequest.days },
        },
      });
    }

    // If cancelled after approval, revert the used days
    if (data.status === "CANCELLED" && leaveRequest.status === "APPROVED") {
      const year = leaveRequest.startDate.getFullYear();
      await prisma.leaveAllocation.update({
        where: {
          userId_leaveTypeId_year: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
        },
        data: {
          used: { decrement: leaveRequest.days },
        },
      });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: {
        leaveType: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    const auditAction = data.status === "APPROVED" ? "APPROVE" : data.status === "REJECTED" ? "REJECT" : "CANCEL";
    await createAuditLog({
      userId: currentUser.id,
      action: auditAction,
      entity: "LEAVE_REQUEST",
      entityId: id,
      details: {
        status: data.status,
        employeeId: leaveRequest.user?.employeeId,
        days: leaveRequest.days,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: { leaveRequest: updated },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update leave request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
