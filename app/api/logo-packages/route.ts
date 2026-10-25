import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const packages = await prisma.logoServicePackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { priceSatang: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceSatang: true,
        revisionLimit: true,
        deliveryDays: true,
        deliverables: true,
      },
    });
    return NextResponse.json({ data: packages }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
