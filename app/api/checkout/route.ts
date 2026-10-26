import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/admin-guard";
import { isJsonContentType } from "@/lib/content-type";
import { jsonBodyError, readJsonBodyLimited } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(6).max(40),
  }).strict(),
  shippingAddress: z.object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(40),
    addressLine1: z.string().trim().min(3).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    subdistrict: z.string().trim().max(120).optional(),
    district: z.string().trim().min(1).max(120),
    province: z.string().trim().min(1).max(120),
    postalCode: z.string().trim().regex(/^\d{5}$/),
    countryCode: z.literal("TH").default("TH"),
  }).strict(),
  items: z.array(z.object({
    variantId: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(10),
  }).strict()).min(1).max(20).refine(
    items => new Set(items.map(item => item.variantId)).size === items.length,
    "Duplicate variants must be combined into one line.",
  ),
  customerNote: z.string().trim().max(500).optional(),
}).strict();

function makeOrderNumber() {
  return `LS-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return apiError("UNSUPPORTED_MEDIA_TYPE", 415);
  }
  if (!process.env.DATABASE_URL) return apiError("SERVICE_UNAVAILABLE", 503);

  const body = await readJsonBodyLimited(request, 24_000);
  if (!body.ok) return jsonBodyError(body.kind);
  const parsed = checkoutSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, {
      status: 400, headers: { "Cache-Control": "no-store" },
    });
  }

  const input = parsed.data;
  try {
    const order = await prisma.$transaction(async tx => {
      const existing = await tx.order.findUnique({
        where: { checkoutKey: input.idempotencyKey },
        select: { id: true, orderNumber: true, status: true, totalSatang: true, reservationExpiresAt: true },
      });
      if (existing) return { ...existing, replay: true };

      const variantIds = input.items.map(item => item.variantId).sort();
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          isActive: true,
          product: { status: "ACTIVE", category: { isActive: true } },
        },
        select: {
          id: true, productId: true, sku: true, name: true, priceSatang: true,
          stockOnHand: true, stockReserved: true,
          product: { select: { name: true } },
        },
      });
      const byId = new Map(variants.map(variant => [variant.id, variant]));
      if (byId.size !== input.items.length) throw new Error("CHECKOUT_ITEM_UNAVAILABLE");

      const lineItems = input.items.map(item => {
        const variant = byId.get(item.variantId);
        if (!variant || !Number.isSafeInteger(variant.priceSatang) || variant.priceSatang < 0) {
          throw new Error("CHECKOUT_ITEM_UNAVAILABLE");
        }
        const lineTotalSatang = variant.priceSatang * item.quantity;
        if (!Number.isSafeInteger(lineTotalSatang)) throw new Error("CHECKOUT_TOTAL_INVALID");
        return { ...item, variant, lineTotalSatang };
      });
      const subtotalSatang = lineItems.reduce((sum, item) => sum + item.lineTotalSatang, 0);
      if (!Number.isSafeInteger(subtotalSatang) || subtotalSatang < 1 || subtotalSatang > 2_000_000_000) {
        throw new Error("CHECKOUT_TOTAL_INVALID");
      }

      // Conditional SQL update serializes competing checkouts at the database row.
      // A reservation is only successful when available stock remains at update time.
      for (const item of [...lineItems].sort((a, b) => a.variant.id.localeCompare(b.variant.id))) {
        const changed = await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET "stockReserved" = "stockReserved" + ${item.quantity}, "updatedAt" = NOW()
          WHERE "id" = ${item.variant.id}
            AND "isActive" = TRUE
            AND "stockOnHand" - "stockReserved" >= ${item.quantity}
        `;
        if (changed !== 1) throw new Error("CHECKOUT_STOCK_UNAVAILABLE");
      }

      const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const created = await tx.order.create({
        data: {
          orderNumber: makeOrderNumber(),
          checkoutKey: input.idempotencyKey,
          reservationExpiresAt,
          status: "AWAITING_PAYMENT",
          customerName: input.customer.name,
          customerEmail: input.customer.email.toLowerCase(),
          customerPhone: input.customer.phone,
          shippingAddress: {
            ...input.shippingAddress,
            recipientName: input.shippingAddress.recipientName,
            phone: input.shippingAddress.phone,
          },
          subtotalSatang,
          discountSatang: 0,
          shippingSatang: 0,
          totalSatang: subtotalSatang,
          currency: "THB",
          customerNote: input.customerNote || null,
          items: {
            create: lineItems.map(item => ({
              productId: item.variant.productId,
              variantId: item.variant.id,
              productName: item.variant.product.name,
              variantName: item.variant.name,
              sku: item.variant.sku,
              unitPriceSatang: item.variant.priceSatang,
              quantity: item.quantity,
              lineTotalSatang: item.lineTotalSatang,
            })),
          },
        },
        select: { id: true, orderNumber: true, status: true, totalSatang: true, reservationExpiresAt: true },
      });

      for (const item of lineItems) {
        await tx.inventoryMovement.create({
          data: {
            variantId: item.variant.id,
            type: "RESERVED",
            quantity: item.quantity,
            referenceType: "ORDER",
            referenceId: created.id,
            note: "Stock reserved during checkout; expires after 15 minutes if unpaid.",
          },
        });
      }
      return { ...created, replay: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 15000 });

    return NextResponse.json({
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalSatang: order.totalSatang,
        reservationExpiresAt: order.reservationExpiresAt,
        replay: order.replay,
        paymentRequired: true,
        paymentConfigured: false,
      },
    }, { status: order.replay ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "CHECKOUT_ITEM_UNAVAILABLE") return apiError("ITEM_UNAVAILABLE", 409);
    if (error instanceof Error && error.message === "CHECKOUT_STOCK_UNAVAILABLE") return apiError("INSUFFICIENT_STOCK", 409);
    if (error instanceof Error && error.message === "CHECKOUT_TOTAL_INVALID") return apiError("INVALID_ORDER_TOTAL", 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.order.findUnique({
        where: { checkoutKey: input.idempotencyKey },
        select: { orderNumber: true, status: true, totalSatang: true, reservationExpiresAt: true },
      }).catch(() => null);
      if (existing) return NextResponse.json({ data: { ...existing, replay: true, paymentRequired: true, paymentConfigured: false } }, {
        status: 200, headers: { "Cache-Control": "no-store" },
      });
    }
    return apiError("CHECKOUT_UNAVAILABLE", 503);
  }
}
