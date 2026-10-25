import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const packageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(5).max(3000),
  priceSatang: z.number().int().min(0).max(100_000_000),
  revisionLimit: z.number().int().min(0).max(50).default(2),
  deliveryDays: z.number().int().min(1).max(365).default(7),
  deliverables: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  isActive: z.boolean().default(false),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
}).strict();

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  try {
    const data = await prisma.logoServicePackage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "PACKAGES_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { session, response } = await requireAdmin();
  if (response) return response;
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await prisma.$transaction(async tx => {
      const created = await tx.logoServicePackage.create({ data: parsed.data });
      await tx.auditLog.create({
        data: {
          action: "LOGO_PACKAGE_CREATED",
          entityType: "LogoServicePackage",
          entityId: created.id,
          metadata: { slug: created.slug, priceSatang: created.priceSatang, actorEmail: session.email },
        },
      });
      return created;
    });
    return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "PACKAGE_SLUG_ALREADY_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "PACKAGE_CREATE_FAILED" }, { status: 503 });
  }
}
