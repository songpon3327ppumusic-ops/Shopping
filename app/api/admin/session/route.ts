import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json(
    { authenticated: Boolean(session), ...(session ? { admin: { email: session.email, role: session.role } } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
