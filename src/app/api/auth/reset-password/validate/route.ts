import { NextRequest, NextResponse } from "next/server";
import { checkResetToken } from "@/lib/password-reset";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ success: true, valid: false });
  }

  const { valid, reason } = await checkResetToken(token);

  return NextResponse.json({ success: true, valid, reason });
}
