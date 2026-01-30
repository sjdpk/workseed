import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createAuditLog, getRequestMeta } from "@/lib";

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  const response = NextResponse.json({ success: true });

  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  // Audit log
  if (currentUser) {
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: currentUser.id,
      action: "LOGOUT",
      entity: "USER",
      entityId: currentUser.id,
      ipAddress,
      userAgent,
    });
  }

  return response;
}
