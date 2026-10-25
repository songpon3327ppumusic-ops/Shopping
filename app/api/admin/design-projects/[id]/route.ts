import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["INQUIRY", "AWAITING_BRIEF", "QUOTED", "AWAITING_PAYMENT", "IN_PROGRESS", "REVIEW", "REVISION", "APPROVED", "COMPLETED", "CANCELLED"]).optional(),
  quotedPriceSatang: z.number().int().min(0).max(100_000_000).nullable().optional(),
  finalPriceSatang: z.number().int().min(0).max(100_000_000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "At least one field is required.");

const transitions: Record<string, string[]> = {
  INQUIRY: ["AWAITING_BRIEF", "QUOTED", "CANCELLED"],
  AWAITING_BRIEF: ["INQUIRY", "QUOTED", "CANCELLED"],
  QUOTED: ["AWAITING_BRIEF", "AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["QUOTED", "CANCELLED"],
  IN_PROGRESS: ["REVIEW", "REVISION", "CANCELLED"],
  REVIEW: ["REVISION", "APPROVED", "IN_PROGRESS", "CANCELLED"],
  REVISION: ["IN_PROGRESS", "REVIEW", "CANCELLED"],
  APPROVED: ["COMPLETED", "REVISION"],
  COMPLETED: [],
  CANCELLED: [],
};

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
  const input = parsed.data;
  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.designProject.findUnique({
        where: { id },
        select: { id: true, status: true, completedAt: true },
      });
      if (!current) return { kind: "NOT_FOUND" as const };
      if (input.status && input.status !== current.status &&
          !(transitions[current.status] || []).includes(input.status)) {
        return { kind: "INVALID_TRANSITION" as const, from: current.status, to: input.status };
      }

      const data: {
        status?: typeof input.status;
        quotedPriceSatang?: number | null;
        finalPriceSatang?: number | null;
        dueAt?: Date | null;
        completedAt?: Date | null;
      } = {};
      if (input.status !== undefined) {
        data.status = input.status;
        if (input.status === "COMPLETED") data.completedAt = new Date();
        if (input.status === "CANCELLED") data.completedAt = null;
      }
      if (input.quotedPriceSatang !== undefined) data.quotedPriceSatang = input.quotedPriceSatang;
      if (input.finalPriceSatang !== undefined) data.finalPriceSatang = input.finalPriceSatang;
      if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;

      const updated = await tx.designProject.update({
        where: { id },
        data,
        select: { id: true, projectNumber: true, status: true, quotedPriceSatang: true, finalPriceSatang: true, dueAt: true, completedAt: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          action: "DESIGN_PROJECT_UPDATED",
          entityType: "DesignProject",
          entityId: id,
          metadata: { changedFields: Object.keys(input), fromStatus: current.status, toStatus: input.status ?? current.status, actorEmail: session.email },
        },
      });
      return { kind: "OK" as const, data: updated };
    });

    if (result.kind === "NOT_FOUND") return NextResponse.json({ error: "DESIGN_PROJECT_NOT_FOUND" }, { status: 404 });
    if (result.kind === "INVALID_TRANSITION") {
      return NextResponse.json({ error: "INVALID_STATUS_TRANSITION", from: result.from, to: result.to }, { status: 409 });
    }
    return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "DESIGN_PROJECT_UPDATE_FAILED" }, { status: 503 });
  }
}
