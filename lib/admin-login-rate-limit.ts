import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; kind: "limited"; retryAfterSeconds: number }
  | { ok: false; kind: "unavailable" };

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const LUA_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('TTL', KEYS[1])",
  "return {count, ttl}",
].join("\n");

/**
 * Shared, atomic IP-based limiter for admin login.
 * Requires Upstash Redis REST credentials and a trusted Cloudflare client IP.
 * Fails closed when configuration or the rate-limit service is unavailable.
 */
export async function checkAdminLoginRateLimit(clientIp: string | null): Promise<RateLimitResult> {
  const urlValue = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!urlValue || !token || !clientIp || isIP(clientIp) === 0) {
    return { ok: false, kind: "unavailable" };
  }

  let endpoint: URL;
  try {
    endpoint = new URL(urlValue);
  } catch {
    return { ok: false, kind: "unavailable" };
  }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
    return { ok: false, kind: "unavailable" };
  }

  const ipHash = createHash("sha256").update(clientIp).digest("hex");
  const key = `lumiere:admin-login:${ipHash}`;

  try {
    const response = await fetch(endpoint.toString().replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", LUA_SCRIPT, "1", key, String(WINDOW_SECONDS)]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return { ok: false, kind: "unavailable" };

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("result" in payload)) {
      return { ok: false, kind: "unavailable" };
    }
    const result = (payload as { result: unknown }).result;
    if (!Array.isArray(result) || result.length !== 2) {
      return { ok: false, kind: "unavailable" };
    }
    const count = Number(result[0]);
    const ttl = Number(result[1]);
    if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttl) || ttl < 0) {
      return { ok: false, kind: "unavailable" };
    }
    if (count > MAX_ATTEMPTS) {
      return { ok: false, kind: "limited", retryAfterSeconds: Math.max(1, ttl) };
    }
    return { ok: true, remaining: MAX_ATTEMPTS - count };
  } catch {
    return { ok: false, kind: "unavailable" };
  }
}
