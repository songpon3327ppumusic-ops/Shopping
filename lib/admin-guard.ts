import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { checkRequestOrigin } from "@/lib/origin-check";

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return { session, response: null };
}

/**
 * Require same-origin requests for browser-based mutations.
 * This is defense-in-depth alongside HttpOnly + SameSite=Strict cookies.
 */
export function requireSameOrigin(request: NextRequest): NextResponse | null {
  const result = checkRequestOrigin(
    request.headers.get("origin"),
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get("x-forwarded-proto"),
    process.env.NODE_ENV,
  );

  if (result === "OK") return null;
  return NextResponse.json(
    { error: result },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

