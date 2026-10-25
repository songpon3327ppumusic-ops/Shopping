import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "__Host-lumiere-admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(email: string): Promise<void> {
  const token = await new SignJWT({ role: "ADMIN", email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("lumiere-studio")
    .setAudience("lumiere-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setJti(crypto.randomUUID())
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getAdminSession(): Promise<{ email: string; role: "ADMIN" } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
      issuer: "lumiere-studio",
      audience: "lumiere-admin",
    });
    if (payload.role !== "ADMIN" || typeof payload.email !== "string") return null;
    return { email: payload.email, role: "ADMIN" };
  } catch {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
