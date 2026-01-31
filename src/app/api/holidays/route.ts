import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET - Fetch holidays
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
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: { holidays },
    });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch holidays" }, { status: 500 });
  }
}

// POST - Create holiday (Admin/HR only)
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

    // Check if user is Admin or HR
    if (!["ADMIN", "HR"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, date, type, description } = body;

    if (!name || !date) {
      return NextResponse.json({ success: false, error: "Name and date are required" }, { status: 400 });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        type: type || "PUBLIC",
        description,
      },
    });

    return NextResponse.json({
      success: true,
      data: { holiday },
    });
  } catch (error) {
    console.error("Error creating holiday:", error);
    return NextResponse.json({ success: false, error: "Failed to create holiday" }, { status: 500 });
  }
}
