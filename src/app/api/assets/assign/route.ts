import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const assignSchema = z.object({
  assetId: z.string().uuid("Invalid asset ID"),
  userId: z.string().uuid("Invalid user ID"),
  notes: z.string().optional(),
});

const returnSchema = z.object({
  assetId: z.string().uuid("Invalid asset ID"),
  returnCondition: z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"]),
  returnNotes: z.string().optional(),
});

// POST /api/assets/assign - Assign asset to user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "ASSET_ASSIGN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignSchema.parse(body);

    // Get the asset
    const asset = await prisma.asset.findUnique({
      where: { id: validatedData.assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (!asset.isActive) {
      return NextResponse.json(
        { error: "Asset is not active" },
        { status: 400 }
      );
    }

    if (asset.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `Asset is not available. Current status: ${asset.status}` },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create assignment record and update asset in transaction
    const [updatedAsset, assignment] = await prisma.$transaction([
      // Update asset
      prisma.asset.update({
        where: { id: validatedData.assetId },
        data: {
          assignedToId: validatedData.userId,
          assignedAt: new Date(),
          status: "ASSIGNED",
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
            },
          },
        },
      }),
      // Create assignment history record
      prisma.assetAssignment.create({
        data: {
          assetId: validatedData.assetId,
          userId: validatedData.userId,
          assignedById: user.id,
          condition: asset.condition,
          notes: validatedData.notes,
        },
      }),
    ]);

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "ASSIGN",
      entity: "ASSET_ASSIGNMENT",
      entityId: assignment.id,
      details: {
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        assignedToId: targetUser.id,
        assignedToName: `${targetUser.firstName} ${targetUser.lastName}`,
        assignedToEmail: targetUser.email,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: "Asset assigned successfully",
      asset: updatedAsset,
      assignment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Assign asset error:", error);
    return NextResponse.json(
      { error: "Failed to assign asset" },
      { status: 500 }
    );
  }
}

// PATCH /api/assets/assign - Return asset
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "ASSET_RETURN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = returnSchema.parse(body);

    // Get the asset
    const asset = await prisma.asset.findUnique({
      where: { id: validatedData.assetId },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.status !== "ASSIGNED" || !asset.assignedToId) {
      return NextResponse.json(
        { error: "Asset is not currently assigned" },
        { status: 400 }
      );
    }

    const previousAssignee = asset.assignedTo;

    // Find the active assignment record
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: asset.id,
        userId: asset.assignedToId,
        returnedAt: null,
      },
      orderBy: { assignedAt: "desc" },
    });

    // Update in transaction
    const [updatedAsset] = await prisma.$transaction([
      // Update asset
      prisma.asset.update({
        where: { id: validatedData.assetId },
        data: {
          assignedToId: null,
          assignedAt: null,
          status: "AVAILABLE",
          condition: validatedData.returnCondition,
        },
      }),
      // Update assignment record if exists
      ...(activeAssignment
        ? [
            prisma.assetAssignment.update({
              where: { id: activeAssignment.id },
              data: {
                returnedAt: new Date(),
                returnedById: user.id,
                returnCondition: validatedData.returnCondition,
                returnNotes: validatedData.returnNotes,
              },
            }),
          ]
        : []),
    ]);

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "RETURN",
      entity: "ASSET_ASSIGNMENT",
      entityId: activeAssignment?.id || asset.id,
      details: {
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        returnedFromId: previousAssignee?.id,
        returnedFromName: previousAssignee
          ? `${previousAssignee.firstName} ${previousAssignee.lastName}`
          : null,
        returnCondition: validatedData.returnCondition,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: "Asset returned successfully",
      asset: updatedAsset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Return asset error:", error);
    return NextResponse.json(
      { error: "Failed to return asset" },
      { status: 500 }
    );
  }
}
