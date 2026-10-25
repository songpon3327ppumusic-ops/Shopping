import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

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
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production" ? "https" : "http");

  if (!origin || !host) {
    return NextResponse.json({ error: "ORIGIN_REQUIRED" }, { status: 403 });
  }

  try {
    const parsedOrigin = new URL(origin);
    const normalizedHost = host.split(",")[0].trim().toLowerCase();
    if (parsedOrigin.host.toLowerCase() !== normalizedHost || parsedOrigin.protocol !== `${proto}:`) {
      return NextResponse.json({ error: "CROSS_ORIGIN_REQUEST_BLOCKED" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  return null;
}
