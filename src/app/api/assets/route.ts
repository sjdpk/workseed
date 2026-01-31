import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAuditLog, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const assetCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum([
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
  ]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  warrantyExpiry: z.string().optional(),
  condition: z
    .enum(["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"])
    .default("NEW"),
  location: z.string().optional(),
  notes: z.string().optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
});

// Generate unique asset tag
async function generateAssetTag(): Promise<string> {
  const lastAsset = await prisma.asset.findFirst({
    orderBy: { assetTag: "desc" },
    where: {
      assetTag: {
        startsWith: "AST-",
      },
    },
  });

  let nextNumber = 1;
  if (lastAsset?.assetTag) {
    const match = lastAsset.assetTag.match(/AST-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `AST-${nextNumber.toString().padStart(5, "0")}`;
}

// GET /api/assets - Get all assets or user's assigned assets
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const userId = searchParams.get("userId") || "";
    const unassigned = searchParams.get("unassigned") === "true";

    const canViewAll = hasPermission(user.role, "ASSET_VIEW_ALL");

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    // If user can't view all assets, only show their own assigned assets
    if (!canViewAll) {
      where.assignedToId = user.id;
    }

    // Filter by specific user (admin/HR only)
    if (userId && canViewAll) {
      where.assignedToId = userId;
    }

    // Filter unassigned assets (admin/HR only)
    if (unassigned && canViewAll) {
      where.assignedToId = null;
      where.status = "AVAILABLE";
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { assetTag: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
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
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get assets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

// POST /api/assets - Create a new asset
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "ASSET_CREATE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assetCreateSchema.parse(body);

    // Check for duplicate serial number if provided
    if (validatedData.serialNumber) {
      const existingAsset = await prisma.asset.findUnique({
        where: { serialNumber: validatedData.serialNumber },
      });
      if (existingAsset) {
        return NextResponse.json(
          { error: "An asset with this serial number already exists" },
          { status: 400 }
        );
      }
    }

    const assetTag = await generateAssetTag();

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        name: validatedData.name,
        category: validatedData.category,
        brand: validatedData.brand,
        model: validatedData.model,
        serialNumber: validatedData.serialNumber || null,
        description: validatedData.description,
        purchaseDate: validatedData.purchaseDate
          ? new Date(validatedData.purchaseDate)
          : null,
        purchasePrice: validatedData.purchasePrice,
        warrantyExpiry: validatedData.warrantyExpiry
          ? new Date(validatedData.warrantyExpiry)
          : null,
        condition: validatedData.condition,
        location: validatedData.location,
        notes: validatedData.notes,
        specifications: validatedData.specifications as object | undefined,
        status: "AVAILABLE",
      },
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
      action: "CREATE",
      entity: "ASSET",
      entityId: asset.id,
      details: {
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Create asset error:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}
