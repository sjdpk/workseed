import { NextResponse } from "next/server";
import { prisma } from "@/lib";

// Public endpoint - no authentication required
// Returns only organization name and logo for branding purposes (e.g., login page)
export async function GET() {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      select: {
        name: true,
        logoUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        settings: {
          name: settings?.name || "Workseed",
          logoUrl: settings?.logoUrl || null,
        },
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        settings: {
          name: "Workseed",
          logoUrl: null,
        },
      },
    });
  }
}
