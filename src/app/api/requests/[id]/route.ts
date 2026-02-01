import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRequestNotification } from "@/lib/notifications";

// PUT - Update request (approve/reject by Admin/HR, or cancel by owner)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, response } = body;

    // Get the existing request
    const existingRequest = await prisma.employeeRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    const isAdminOrHR = ["ADMIN", "HR"].includes(payload.role);
    const isOwner = existingRequest.userId === payload.userId;

    // Owners can only cancel their pending requests
    if (!isAdminOrHR) {
      if (!isOwner) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
      }
      if (status !== "CANCELLED") {
        return NextResponse.json(
          { success: false, error: "You can only cancel your requests" },
          { status: 403 }
        );
      }
      if (existingRequest.status !== "PENDING") {
        return NextResponse.json(
          { success: false, error: "Only pending requests can be cancelled" },
          { status: 400 }
        );
      }
    }

    const updatedRequest = await prisma.employeeRequest.update({
      where: { id },
      data: {
        status,
        ...(isAdminOrHR && { approverId: payload.userId, approvedAt: new Date() }),
        ...(response && { response }),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send notification via notification service (non-blocking)
    if (status === "APPROVED" || status === "REJECTED") {
      const userEmail = (updatedRequest.user as { email?: string })?.email;
      const notificationType = status === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED";

      if (userEmail) {
        sendRequestNotification(notificationType, {
          requestId: id,
          userId: existingRequest.userId,
          userEmail,
          userName: `${updatedRequest.user.firstName} ${updatedRequest.user.lastName}`,
          requestType: existingRequest.type,
          subject: existingRequest.subject,
          approverName: updatedRequest.approver
            ? `${updatedRequest.approver.firstName} ${updatedRequest.approver.lastName}`
            : "System",
          response,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { request: updatedRequest },
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}

// DELETE - Delete request (owner only, if pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;

    const existingRequest = await prisma.employeeRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    const isAdminOrHR = ["ADMIN", "HR"].includes(payload.role);
    const isOwner = existingRequest.userId === payload.userId;

    if (!isAdminOrHR && !isOwner) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    if (!isAdminOrHR && existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Only pending requests can be deleted" },
        { status: 400 }
      );
    }

    await prisma.employeeRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
