import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const now = new Date();
  try {
    const expired = await prisma.order.findMany({
      where: { status: "AWAITING_PAYMENT", reservationExpiresAt: { lte: now } },
      select: { id: true, orderNumber: true },
      orderBy: { reservationExpiresAt: "asc" },
      take: 100,
    });
    let releasedOrders = 0;

    for (const candidate of expired) {
      const released = await prisma.$transaction(async tx => {
        // Claim the order first. The conditional transition makes repeated cron runs idempotent.
        const claimed = await tx.order.updateMany({
          where: { id: candidate.id, status: "AWAITING_PAYMENT", reservationExpiresAt: { lte: now } },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        if (claimed.count !== 1) return false;

        const items = await tx.orderItem.findMany({
          where: { orderId: candidate.id },
          select: { variantId: true, quantity: true },
        });
        for (const item of items) {
          const changed = await tx.$executeRaw`
            UPDATE "ProductVariant"
            SET "stockReserved" = "stockReserved" - ${item.quantity}, "updatedAt" = NOW()
            WHERE "id" = ${item.variantId} AND "stockReserved" >= ${item.quantity}
          `;
          if (changed !== 1) throw new Error("RESERVATION_LEDGER_MISMATCH");

          await tx.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              type: "RELEASED",
              quantity: item.quantity,
              referenceType: "ORDER",
              referenceId: candidate.id,
              note: "Unpaid checkout reservation expired and was released.",
            },
          });
        }
        return true;
      });
      if (released) releasedOrders += 1;
    }

    return NextResponse.json({ data: { scanned: expired.length, releasedOrders } }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "RESERVATION_CLEANUP_FAILED" }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" },
    });
  }
}
