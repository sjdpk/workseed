import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ success: true, valid: false });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  const valid = resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  return NextResponse.json({ success: true, valid });
}
