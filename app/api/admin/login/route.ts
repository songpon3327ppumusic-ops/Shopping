import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminSession } from "@/lib/admin-auth";
import { isJsonContentType } from "@/lib/content-type";
import { requireSameOrigin } from "@/lib/admin-guard";
import { jsonBodyError, readJsonBodyLimited } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
}).strict();

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  // A shared, durable edge rate limiter is mandatory before public exposure.
  // App-instance memory counters are intentionally not used because they are
  // bypassable across serverless instances and restarts.

  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedEmail || !passwordHash || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: "ADMIN_AUTH_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }

  const body = await readJsonBodyLimited(request, 4_000);
  if (!body.ok) return jsonBodyError(body.kind);
  const raw: unknown = body.value;

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(parsed.data.password, passwordHash);
  } catch {
    return NextResponse.json({ error: "ADMIN_AUTH_NOT_CONFIGURED" }, { status: 503 });
  }

  if (email !== expectedEmail || !passwordMatches) {
    // Keep failure responses identical to avoid disclosing which field was wrong.
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await createAdminSession(email);
  } catch {
    return NextResponse.json({ error: "ADMIN_AUTH_NOT_CONFIGURED" }, { status: 503 });
  }

  return NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
