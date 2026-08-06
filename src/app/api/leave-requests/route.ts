import { NextRequest, NextResponse } from "next/server";
import { prisma, getCurrentUser, isManagerOrAbove, createAuditLog, getRequestMeta } from "@/lib";
import { sendLeaveNotification } from "@/lib/notifications";
import { describeFiscalYear } from "@/lib/fiscal-year";
import { getFiscalYearConfig, getFiscalYearFor } from "@/lib/fiscal-year-server";
import { logger } from "@/lib/logger";
import {
  dateOnlyToUtcDate,
  formatDateOnly,
  isDateOnly,
  toDateOnly,
  utcDateToDateOnly,
} from "@/lib/time";
import { getOrgTimeZone } from "@/lib/time-server";
import { z } from "@/lib/validation";
import { can } from "@/lib/rbac";

/** Working days between two calendar dates, inclusive. Computed here rather than
 *  trusting the browser: `days` is what a balance is debited by. */
function countLeaveDays(startDate: string, endDate: string, isHalfDay: boolean): number {
  const start = dateOnlyToUtcDate(startDate).getTime();
  const end = dateOnlyToUtcDate(endDate).getTime();
  const spanDays = Math.round((end - start) / 86_400_000) + 1;
  if (isHalfDay) return 0.5;
  return spanDays;
}

const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().refine(isDateOnly, { message: "startDate must be YYYY-MM-DD" }),
  endDate: z.string().refine(isDateOnly, { message: "endDate must be YYYY-MM-DD" }),
  /* accepted for backwards compatibility but recomputed server-side */
  days: z.number().min(0.5).optional(),
  isHalfDay: z.boolean().default(false),
  halfDayType: z.enum(["FIRST_HALF", "SECOND_HALF"]).optional(),
  reason: z.string().optional(),
});

const updateLeaveRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED", "PENDING"]),
  rejectionReason: z.string().optional(),
  cancelReason: z.string().optional(),
  revertReason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    /* Fiscal year, for looking back at a previous year's leave. */
    const yearParam = searchParams.get("year");
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

    const yearFilter = yearParam
      ? await (async () => {
          const [config, timeZone] = await Promise.all([getFiscalYearConfig(), getOrgTimeZone()]);
          const fy = describeFiscalYear(parseInt(yearParam, 10), config, timeZone);
          return {
            gte: dateOnlyToUtcDate(toDateOnly(fy.start, timeZone)),
            lte: dateOnlyToUtcDate(toDateOnly(fy.end, timeZone)),
          };
        })()
      : null;

    if (all === "true" && canViewLeaveRequests) {
      // Hierarchical leave viewing based on role
      if (await can(currentUser, "LEAVE_REQUEST_APPROVE")) {
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
    } else if (
      searchParams.get("department") === "true" &&
      employeesCanViewDepartmentLeaves &&
      currentUser.departmentId
    ) {
      // Employees viewing department leaves (if permission enabled)
      where = {
        user: { departmentId: currentUser.departmentId },
        status: "APPROVED", // Only show approved leaves to department members
      };
      scope = "department_approved";
    } else if (pending === "true" && isManagerOrAbove(currentUser.role)) {
      // Get pending requests for approval
      if (await can(currentUser, "LEAVE_REQUEST_APPROVE")) {
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
    } else if (userId && (await can(currentUser, "LEAVE_REQUEST_APPROVE"))) {
      where = { userId };
      scope = "specific_user";
    } else {
      where = { userId: currentUser.id };
      scope = "own";
    }

    if (status) {
      where.status = status;
    }
    if (yearFilter) {
      where.startDate = yearFilter;
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
    logger.error("List leave requests error", { error, endpoint: "GET /api/leave-requests" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createLeaveRequestSchema.parse(body);

    if (dateOnlyToUtcDate(data.endDate) < dateOnlyToUtcDate(data.startDate)) {
      return NextResponse.json(
        { success: false, error: "End date cannot be before the start date" },
        { status: 400 }
      );
    }
    if (data.isHalfDay && data.startDate !== data.endDate) {
      return NextResponse.json(
        { success: false, error: "A half day must start and end on the same date" },
        { status: 400 }
      );
    }

    /* Never trust the client's day count — it decides how much balance is spent. */
    const days = countLeaveDays(data.startDate, data.endDate, data.isHalfDay);

    // Check leave balance against the fiscal year the leave starts in
    const { year } = await getFiscalYearFor(data.startDate);
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

    const balance =
      allocation.allocated + allocation.carriedOver + allocation.adjusted - allocation.used;

    /* An exhausted balance is not always a hard stop: Settings → Leave Policy can
       allow a negative balance up to a limit. Those two settings were written by
       the policy screen but never read, so the answer was always "no". */
    const orgForPolicy = await prisma.organizationSettings.findFirst({
      select: { defaultLeaveAllocation: true },
    });
    const policy = ((orgForPolicy?.defaultLeaveAllocation as Record<string, unknown>)
      ?.leavePolicy ?? {}) as { allowNegativeBalance?: boolean; maxNegativeBalance?: number };
    const overdraft = policy.allowNegativeBalance ? Math.max(0, policy.maxNegativeBalance ?? 0) : 0;

    if (days > balance + overdraft) {
      const detail = overdraft
        ? `Requested ${days}; ${balance} left plus ${overdraft} allowed in advance`
        : `Requested ${days}, available ${balance} days`;
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient leave balance. ${detail}. Ask HR to adjust your allocation.`,
        },
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
            startDate: { lte: dateOnlyToUtcDate(data.endDate) },
            endDate: { gte: dateOnlyToUtcDate(data.startDate) },
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
        startDate: dateOnlyToUtcDate(data.startDate),
        endDate: dateOnlyToUtcDate(data.endDate),
        days,
        isHalfDay: data.isHalfDay,
        halfDayType: data.halfDayType,
        reason: data.reason,
      },
      include: {
        leaveType: true,
      },
    });

    // Send notification via notification service (non-blocking)
    sendLeaveNotification("LEAVE_REQUEST_SUBMITTED", {
      leaveRequestId: leaveRequest.id,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      leaveType: leaveRequest.leaveType.name,
      startDate: formatDateOnly(data.startDate),
      endDate: formatDateOnly(data.endDate),
      days,
      reason: data.reason,
    });

    return NextResponse.json({ success: true, data: { leaveRequest } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Create leave request error", { error, endpoint: "POST /api/leave-requests" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
    } else if (data.status === "PENDING") {
      // Revert - only approvers can revert
      if (!canApprove) {
        return NextResponse.json(
          { success: false, error: "Not authorized to revert status" },
          { status: 403 }
        );
      }
      // Can only revert from APPROVED or REJECTED
      if (leaveRequest.status !== "APPROVED" && leaveRequest.status !== "REJECTED") {
        return NextResponse.json(
          { success: false, error: "Can only revert approved or rejected requests" },
          { status: 400 }
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

    // If reverting to PENDING, clear approval info
    if (data.status === "PENDING") {
      updateData.approverId = null;
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
    }

    // If reverting from APPROVED, restore the used days
    if (data.status === "PENDING" && leaveRequest.status === "APPROVED") {
      const { year } = await getFiscalYearFor(leaveRequest.startDate);
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

    // If approved, update the allocation's used days
    if (data.status === "APPROVED") {
      const { year } = await getFiscalYearFor(leaveRequest.startDate);
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
      const { year } = await getFiscalYearFor(leaveRequest.startDate);
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
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Send notification via notification service (non-blocking)
    if (data.status === "APPROVED" || data.status === "REJECTED" || data.status === "CANCELLED") {
      const userEmail = (updated.user as { email?: string })?.email;
      const notificationType =
        data.status === "APPROVED"
          ? "LEAVE_REQUEST_APPROVED"
          : data.status === "REJECTED"
            ? "LEAVE_REQUEST_REJECTED"
            : "LEAVE_REQUEST_CANCELLED";

      if (userEmail) {
        sendLeaveNotification(notificationType, {
          leaveRequestId: leaveRequest.id,
          userId: leaveRequest.userId,
          userEmail,
          userName: `${updated.user.firstName} ${updated.user.lastName}`,
          leaveType: updated.leaveType.name,
          startDate: formatDateOnly(utcDateToDateOnly(leaveRequest.startDate)),
          endDate: formatDateOnly(utcDateToDateOnly(leaveRequest.endDate)),
          days: leaveRequest.days,
          approverName: `${currentUser.firstName} ${currentUser.lastName}`,
          rejectionReason: data.rejectionReason,
        });
      }
    }

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    const auditAction =
      data.status === "APPROVED"
        ? "APPROVE"
        : data.status === "REJECTED"
          ? "REJECT"
          : data.status === "PENDING"
            ? "REVERT"
            : "CANCEL";
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
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    logger.error("Update leave request error", { error, endpoint: "PATCH /api/leave-requests" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
