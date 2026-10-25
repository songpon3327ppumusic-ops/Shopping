import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const projects = await prisma.designProject.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, projectNumber: true, status: true, brandName: true,
        contactName: true, contactEmail: true, contactPhone: true,
        brief: true, quotedPriceSatang: true, finalPriceSatang: true,
        dueAt: true, completedAt: true, createdAt: true, updatedAt: true,
        package: { select: { id: true, name: true, slug: true, revisionLimit: true, deliveryDays: true } },
        revisions: {
          orderBy: { revisionNumber: "desc" },
          take: 20,
          select: { id: true, revisionNumber: true, customerFeedback: true, assetUrls: true, createdAt: true },
        },
      },
    });
    return NextResponse.json({ data: projects }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "DESIGN_PROJECTS_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
