import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-auth";
import { requireSameOrigin } from "@/lib/admin-guard";

export const runtime = "nodejs";

export async function POST(request: import("next/server").NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  await destroyAdminSession();
  return NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
