import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";
import { jsonBodyError, readJsonBodyLimited } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adjustmentSchema = z.object({
  variantId: z.string().min(1).max(100),
  delta: z.number().int().min(-1_000_000).max(1_000_000).refine(value => value !== 0),
  note: z.string().trim().min(3).max(500),
}).strict();

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

  const body = await readJsonBodyLimited(request, 20_000);
  if (!body.ok) return jsonBodyError(body.kind);
  const raw: unknown = body.value;
  const parsed = adjustmentSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });

  const { variantId, delta, note } = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { id: true, stockOnHand: true, stockReserved: true } });
      if (!variant) return { kind: "NOT_FOUND" as const };

      const nextStock = variant.stockOnHand + delta;
      if (nextStock < variant.stockReserved) return { kind: "INSUFFICIENT" as const };

      // Compare-and-set update prevents concurrent adjustments from silently overwriting one another.
      const changed = await tx.productVariant.updateMany({
        where: { id: variantId, stockOnHand: variant.stockOnHand, stockReserved: variant.stockReserved },
        data: { stockOnHand: { increment: delta } },
      });
      if (changed.count !== 1) throw new Error("INVENTORY_CONCURRENT_MODIFICATION");

      await tx.inventoryMovement.create({
        data: {
          variantId,
          type: delta > 0 ? "RECEIVED" : "ADJUSTMENT",
          quantity: delta,
          referenceType: "ADMIN_ADJUSTMENT",
          note,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "INVENTORY_ADJUSTED",
          entityType: "ProductVariant",
          entityId: variantId,
          metadata: { delta, note, actorEmail: session.email },
        },
      });
      return { kind: "OK" as const, stockOnHand: nextStock, availableStock: nextStock - variant.stockReserved };
    });

    if (result.kind === "NOT_FOUND") return NextResponse.json({ error: "VARIANT_NOT_FOUND" }, { status: 404 });
    if (result.kind === "INSUFFICIENT") return NextResponse.json({ error: "STOCK_CANNOT_BE_BELOW_RESERVED" }, { status: 409 });
    return NextResponse.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "INVENTORY_ADJUSTMENT_FAILED_RETRY" }, { status: 409 });
  }
}
