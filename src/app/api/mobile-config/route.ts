import { NextResponse } from "next/server";
import { prisma } from "@/lib";

// Public endpoint - no auth required (for QR code scanning)
export async function GET() {
  try {
    const settings = await prisma.organizationSettings.findFirst();

    if (!settings) {
      return NextResponse.json(
        { success: false, error: "Organization not configured" },
        { status: 404 }
      );
    }

    const permissions = (settings.permissions as Record<string, unknown>) || {};
    const mobileConfig = (permissions.mobileConfig as Record<string, unknown>) || {};

    const config = {
      baseUrl: mobileConfig.baseUrl || null,
      configUrl: mobileConfig.baseUrl ? `${mobileConfig.baseUrl}/api/mobile-config` : null,
      logoUrl: settings.logoUrl || null,
      organizationName: settings.name || null,
      slug: mobileConfig.slug || null,
    };

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Get mobile config error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
