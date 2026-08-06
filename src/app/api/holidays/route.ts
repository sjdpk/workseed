import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { describeFiscalYear } from "@/lib/fiscal-year";
import { getCurrentFiscalYear, getFiscalYearConfig } from "@/lib/fiscal-year-server";
import { prisma } from "@/lib/prisma";
import { dateOnlyToUtcDate, utcDateToDateOnly } from "@/lib/time";
import { getOrgTimeZone } from "@/lib/time-server";

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

    /* Holidays are listed by the company's leave year — the same year every other
       screen counts in — so `?year=2026` means 2026/27 when the company does not
       start on 1 January. */
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get("year");
    const [config, timeZone] = await Promise.all([getFiscalYearConfig(), getOrgTimeZone()]);
    const fiscalYear = requested
      ? describeFiscalYear(parseInt(requested, 10), config, timeZone)
      : await getCurrentFiscalYear();
    const startDate = dateOnlyToUtcDate(utcDateToDateOnly(fiscalYear.start));
    const endDate = dateOnlyToUtcDate(utcDateToDateOnly(fiscalYear.end));

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
    return NextResponse.json(
      { success: false, error: "Failed to fetch holidays" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, error: "Name and date are required" },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: dateOnlyToUtcDate(date),
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
    return NextResponse.json(
      { success: false, error: "Failed to create holiday" },
      { status: 500 }
    );
  }
}
