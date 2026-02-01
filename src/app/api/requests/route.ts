import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { sendRequestSubmitted } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// GET - Fetch requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Admin/HR can see all requests, others see only their own
    const isAdminOrHR = ["ADMIN", "HR"].includes(payload.role);

    const requests = await prisma.employeeRequest.findMany({
      where: {
        ...(!isAdminOrHR && { userId: payload.userId }),
        ...(status && { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }),
        ...(type && { type: type as "ASSET" | "DOCUMENT" | "GENERAL" }),
      },
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
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST - Create request
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, description, priority, assetCategory, documentType } = body;

    if (!type || !subject || !description) {
      return NextResponse.json(
        { success: false, error: "Type, subject, and description are required" },
        { status: 400 }
      );
    }

    const employeeRequest = await prisma.employeeRequest.create({
      data: {
        userId: payload.userId,
        type,
        subject,
        description,
        priority: priority || "NORMAL",
        assetCategory: type === "ASSET" ? assetCategory : null,
        documentType: type === "DOCUMENT" ? documentType : null,
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
      },
    });

    // Send email notification to employee
    const userEmail = (employeeRequest.user as { email?: string })?.email;
    if (userEmail) {
      sendRequestSubmitted(userEmail, {
        employeeName: `${employeeRequest.user.firstName} ${employeeRequest.user.lastName}`,
        requestType: type,
        subject,
        description,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: { request: employeeRequest },
    });
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create request" },
      { status: 500 }
    );
  }
}
