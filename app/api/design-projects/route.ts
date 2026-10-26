import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSameOrigin } from "@/lib/admin-guard";
import { isJsonContentType } from "@/lib/content-type";
import { checkDesignIntakeRateLimit } from "@/lib/admin-login-rate-limit";
import { jsonBodyError, readJsonBodyLimited } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const intakeSchema = z.object({
  packageSlug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brandName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().max(40).optional(),
  brief: z.object({
    businessType: z.string().trim().max(160).optional(),
    stylePreferences: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    preferredColors: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
    textToInclude: z.string().trim().max(500).optional(),
    references: z.array(z.string().url().max(2048)).max(5).default([]),
    notes: z.string().trim().max(2000).optional(),
  }).strict(),
  privacyConsent: z.literal(true),
}).strict();

function makeProjectNumber() {
  return `LS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const rateLimit = await checkDesignIntakeRateLimit(request.headers.get("cf-connecting-ip"));
  if (!rateLimit.ok && rateLimit.kind === "limited") {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
  }
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "30" },
    });
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const body = await readJsonBodyLimited(request, 20_000);
  if (!body.ok) return jsonBodyError(body.kind);
  const raw: unknown = body.value;

  const parsed = intakeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  try {
    const servicePackage = await prisma.logoServicePackage.findFirst({
      where: { slug: input.packageSlug, isActive: true },
      select: { id: true, priceSatang: true },
    });
    if (!servicePackage) {
      return NextResponse.json({ error: "PACKAGE_NOT_AVAILABLE" }, { status: 400 });
    }

    const project = await prisma.designProject.create({
      data: {
        projectNumber: makeProjectNumber(),
        packageId: servicePackage.id,
        status: "AWAITING_BRIEF",
        brandName: input.brandName,
        contactName: input.contactName,
        contactEmail: input.contactEmail.toLowerCase(),
        contactPhone: input.contactPhone || null,
        quotedPriceSatang: servicePackage.priceSatang,
        brief: {
          businessType: input.brief.businessType || "",
          stylePreferences: input.brief.stylePreferences,
          preferredColors: input.brief.preferredColors,
          textToInclude: input.brief.textToInclude || "",
          references: input.brief.references,
          notes: input.brief.notes || "",
          privacyConsentAt: new Date().toISOString(),
        },
      },
      select: { projectNumber: true, status: true, createdAt: true },
    });

    return NextResponse.json(
      { data: { projectNumber: project.projectNumber, status: project.status, createdAt: project.createdAt } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "PROJECT_SUBMISSION_FAILED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
