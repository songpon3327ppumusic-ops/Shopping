import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, description: true, sortOrder: true, isActive: true },
    });
    return NextResponse.json({ data: categories }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "CATEGORIES_UNAVAILABLE" }, { status: 503 });
  }
}
