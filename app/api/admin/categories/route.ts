import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSameOrigin } from "@/lib/admin-guard";
import { jsonBodyError, readJsonBodyLimited } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
  isActive: z.boolean().default(true),
}).strict();

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  try {
    const data = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, description: true, sortOrder: true, isActive: true },
    });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "CATEGORIES_UNAVAILABLE" }, { status: 503 });
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
  const body = await readJsonBodyLimited(request, 20_000);
  if (!body.ok) return jsonBodyError(body.kind);
  const raw: unknown = body.value;
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  try {
    const data = await prisma.$transaction(async tx => {
      const category = await tx.category.create({ data: parsed.data });
      await tx.auditLog.create({
        data: { action: "CATEGORY_CREATED", entityType: "Category", entityId: category.id, metadata: { slug: category.slug, actorEmail: session.email } },
      });
      return category;
    });
    return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "CATEGORY_SLUG_ALREADY_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "CATEGORY_CREATE_FAILED" }, { status: 503 });
  }
}
