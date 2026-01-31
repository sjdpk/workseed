import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const assetUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z
    .enum([
      "LAPTOP",
      "DESKTOP",
      "MOBILE",
      "TABLET",
      "MONITOR",
      "KEYBOARD",
      "MOUSE",
      "HEADSET",
      "FURNITURE",
      "VEHICLE",
      "ID_CARD",
      "ACCESS_CARD",
      "SOFTWARE_LICENSE",
      "OTHER",
    ])
    .optional(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  status: z
    .enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED", "LOST", "DAMAGED"])
    .optional(),
  condition: z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  specifications: z.record(z.string(), z.unknown()).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/assets/[id] - Get single asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            profilePicture: true,
            department: {
              select: { name: true },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check permissions - users can only view their own assets
    const canViewAll = hasPermission(user.role, "ASSET_VIEW_ALL");
    if (!canViewAll && asset.assignedToId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Get asset error:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

// PATCH /api/assets/[id] - Update asset
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "ASSET_EDIT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = assetUpdateSchema.parse(body);

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check for duplicate serial number if changed
    if (
      validatedData.serialNumber &&
      validatedData.serialNumber !== existingAsset.serialNumber
    ) {
      const duplicateSerial = await prisma.asset.findUnique({
        where: { serialNumber: validatedData.serialNumber },
      });
      if (duplicateSerial) {
        return NextResponse.json(
          { error: "An asset with this serial number already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.category !== undefined)
      updateData.category = validatedData.category;
    if (validatedData.brand !== undefined)
      updateData.brand = validatedData.brand;
    if (validatedData.model !== undefined)
      updateData.model = validatedData.model;
    if (validatedData.serialNumber !== undefined)
      updateData.serialNumber = validatedData.serialNumber;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.purchaseDate !== undefined)
      updateData.purchaseDate = validatedData.purchaseDate
        ? new Date(validatedData.purchaseDate)
        : null;
    if (validatedData.purchasePrice !== undefined)
      updateData.purchasePrice = validatedData.purchasePrice;
    if (validatedData.warrantyExpiry !== undefined)
      updateData.warrantyExpiry = validatedData.warrantyExpiry
        ? new Date(validatedData.warrantyExpiry)
        : null;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;
    if (validatedData.condition !== undefined)
      updateData.condition = validatedData.condition;
    if (validatedData.location !== undefined)
      updateData.location = validatedData.location;
    if (validatedData.notes !== undefined)
      updateData.notes = validatedData.notes;
    if (validatedData.specifications !== undefined)
      updateData.specifications = validatedData.specifications;
    if (validatedData.isActive !== undefined)
      updateData.isActive = validatedData.isActive;

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
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

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "ASSET",
      entityId: asset.id,
      details: {
        assetTag: asset.assetTag,
        changes: validatedData,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Update asset error:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}

// DELETE /api/assets/[id] - Delete asset (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "ASSET_DELETE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Soft delete - mark as inactive
    await prisma.asset.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    const { ipAddress, userAgent } = getRequestMeta(request.headers);
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "ASSET",
      entityId: asset.id,
      details: {
        assetTag: asset.assetTag,
        name: asset.name,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error("Delete asset error:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
