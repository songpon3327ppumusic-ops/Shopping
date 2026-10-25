import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  images: z.array(z.string().url().max(2048)).max(8).optional(),
}).strict().refine(value => Object.keys(value).length > 0, "At least one field is required.");

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  try {
    const updated = await prisma.$transaction(async tx => {
      const existing = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;
      const product = await tx.product.update({
        where: { id },
        data: parsed.data,
        select: { id: true, name: true, slug: true, status: true, featured: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          action: "PRODUCT_UPDATED",
          entityType: "Product",
          entityId: id,
          metadata: { changedFields: Object.keys(parsed.data), actorEmail: session.email },
        },
      });
      return product;
    });
    if (!updated) return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ data: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "PRODUCT_UPDATE_FAILED" }, { status: 503 });
  }
}
