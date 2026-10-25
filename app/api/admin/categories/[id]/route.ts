import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(-10000).max(10000).optional(),
  isActive: z.boolean().optional(),
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
    const result = await prisma.$transaction(async tx => {
      const exists = await tx.category.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      const category = await tx.category.update({
        where: { id }, data: parsed.data,
        select: { id: true, name: true, slug: true, description: true, sortOrder: true, isActive: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: { action: "CATEGORY_UPDATED", entityType: "Category", entityId: id, metadata: { changedFields: Object.keys(parsed.data), actorEmail: session.email } },
      });
      return category;
    });
    if (!result) return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "CATEGORY_SLUG_ALREADY_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "CATEGORY_UPDATE_FAILED" }, { status: 503 });
  }
}
