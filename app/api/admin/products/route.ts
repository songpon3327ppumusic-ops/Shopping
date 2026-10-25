import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const variantSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  size: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(60).optional().nullable(),
  priceSatang: z.number().int().min(0).max(100_000_000),
  compareAtSatang: z.number().int().min(0).max(100_000_000).optional().nullable(),
  stockOnHand: z.number().int().min(0).max(1_000_000).default(0),
}).strict();

const createSchema = z.object({
  categoryId: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).default(""),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  images: z.array(z.string().url().max(2048)).max(8).default([]),
  variants: z.array(variantSchema).min(1).max(100),
}).strict().superRefine((value, ctx) => {
  const skus = value.variants.map(v => v.sku.toLowerCase());
  if (new Set(skus).size !== skus.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["variants"], message: "Variant SKUs must be unique." });
  }
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true, name: true, slug: true, description: true, status: true,
        featured: true, images: true, createdAt: true, updatedAt: true,
        category: { select: { id: true, name: true } },
        variants: {
          orderBy: { createdAt: "asc" },
          select: { id: true, sku: true, name: true, size: true, color: true, priceSatang: true, compareAtSatang: true, stockOnHand: true, stockReserved: true, isActive: true },
        },
      },
    });
    return NextResponse.json({ data: products }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "PRODUCTS_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const { session, response } = await requireAdmin();
  if (response) return response;
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const product = await prisma.$transaction(async tx => {
      const category = await tx.category.findFirst({ where: { id: data.categoryId, isActive: true }, select: { id: true } });
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      const created = await tx.product.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          status: data.status,
          featured: data.featured,
          images: data.images,
          variants: { create: data.variants.map(v => ({
            sku: v.sku,
            name: v.name,
            size: v.size ?? null,
            color: v.color ?? null,
            priceSatang: v.priceSatang,
            compareAtSatang: v.compareAtSatang ?? null,
            stockOnHand: v.stockOnHand,
            stockReserved: 0,
          })) },
        },
        select: { id: true, name: true, slug: true, status: true },
      });

      for (const variant of data.variants) {
        if (variant.stockOnHand > 0) {
          const createdVariant = await tx.productVariant.findUniqueOrThrow({ where: { sku: variant.sku }, select: { id: true } });
          await tx.inventoryMovement.create({
            data: {
              variantId: createdVariant.id,
              type: "RECEIVED",
              quantity: variant.stockOnHand,
              referenceType: "PRODUCT_CREATION",
              referenceId: created.id,
              note: "Initial stock",
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: "PRODUCT_CREATED",
          entityType: "Product",
          entityId: created.id,
          metadata: { slug: created.slug, status: created.status, variantCount: data.variants.length, actorEmail: session.email },
        },
      });
      return created;
    });

    return NextResponse.json({ data: product }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 400 });
    }
    // Prisma unique constraint failures (duplicate slug/SKU) return a safe conflict.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "PRODUCT_OR_SKU_ALREADY_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "PRODUCT_CREATE_FAILED" }, { status: 503 });
  }
}
