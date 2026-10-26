import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "CATALOG_UNAVAILABLE", message: "The product database is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", category: { isActive: true } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        images: true,
        featured: true,
        category: { select: { name: true, slug: true } },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            name: true,
            size: true,
            color: true,
            priceSatang: true,
            compareAtSatang: true,
            stockOnHand: true,
            stockReserved: true,
          },
        },
      },
    });

    return NextResponse.json(
      { data: products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          availableStock: Math.max(0, variant.stockOnHand - variant.stockReserved),
        })),
      })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Do not leak connection strings, SQL, or internal exception details to clients.
    return NextResponse.json(
      { error: "CATALOG_UNAVAILABLE", message: "The product catalog is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
