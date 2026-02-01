import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT - Update holiday
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

    if (!["ADMIN", "HR"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, date, type, description, isActive } = body;

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(date && { date: new Date(date) }),
        ...(type && { type }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: { holiday },
    });
  } catch (error) {
    console.error("Error updating holiday:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update holiday" },
      { status: 500 }
    );
  }
}

// DELETE - Delete holiday
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

    if (!["ADMIN", "HR"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.holiday.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete holiday" },
      { status: 500 }
    );
  }
}
