import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAdminLoginRateLimit, checkDesignIntakeRateLimit } from "../lib/admin-login-rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("checkAdminLoginRateLimit", () => {
  it("fails closed when shared rate-limit credentials or trusted client IP are missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(await checkAdminLoginRateLimit("203.0.113.8")).toEqual({ ok: false, kind: "unavailable" });
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    expect(await checkAdminLoginRateLimit(null)).toEqual({ ok: false, kind: "unavailable" });
    expect(await checkAdminLoginRateLimit("not-an-ip")).toEqual({ ok: false, kind: "unavailable" });
  });

  it("fails closed if the rate-limit service is unavailable", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
    expect(await checkAdminLoginRateLimit("203.0.113.8")).toEqual({ ok: false, kind: "unavailable" });
  });

  it("allows attempts under the threshold and blocks attempts above it", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: [1, 60] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: [6, 42] }) });
    vi.stubGlobal("fetch", fetchMock);

    expect(await checkAdminLoginRateLimit("203.0.113.8")).toEqual({ ok: true, remaining: 4 });
    expect(await checkAdminLoginRateLimit("203.0.113.8")).toEqual({
      ok: false, kind: "limited", retryAfterSeconds: 42,
    });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(String(request.body)).not.toContain("203.0.113.8");
    expect(request.cache).toBe("no-store");
  });
  it("uses a separate ten-minute window for public design intake", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [1, 600] }) });
    vi.stubGlobal("fetch", fetchMock);

    expect(await checkDesignIntakeRateLimit("203.0.113.8")).toEqual({ ok: true, remaining: 4 });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(String(request.body)).toContain("design-intake");
    expect(String(request.body)).toContain("600");
  });

});
