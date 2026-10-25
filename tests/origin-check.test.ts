import { describe, expect, it } from "vitest";
import { checkRequestOrigin } from "../lib/origin-check";

describe("checkRequestOrigin", () => {
  it("accepts an exact same-origin HTTPS request in production", () => {
    expect(checkRequestOrigin("https://shop.example", "shop.example", "https", "production")).toBe("OK");
  });

  it("requires both Origin and host", () => {
    expect(checkRequestOrigin(null, "shop.example", "https", "production")).toBe("ORIGIN_REQUIRED");
    expect(checkRequestOrigin("https://shop.example", null, "https", "production")).toBe("ORIGIN_REQUIRED");
  });

  it("rejects cross-origin hosts and protocols", () => {
    expect(checkRequestOrigin("https://evil.example", "shop.example", "https", "production")).toBe("CROSS_ORIGIN_REQUEST_BLOCKED");
    expect(checkRequestOrigin("http://shop.example", "shop.example", "https", "production")).toBe("CROSS_ORIGIN_REQUEST_BLOCKED");
  });

  it("rejects non-HTTP protocols and origins with credentials", () => {
    expect(checkRequestOrigin("javascript://shop.example", "shop.example", "javascript", "production")).not.toBe("OK");
    expect(checkRequestOrigin("https://user:pass@shop.example", "shop.example", "https", "production")).toBe("CROSS_ORIGIN_REQUEST_BLOCKED");
  });

  it("uses the first proxy value and normalizes case", () => {
    expect(checkRequestOrigin("https://shop.example", "SHOP.EXAMPLE, internal.example", "https, http", "production")).toBe("OK");
  });

  it("rejects ambiguous proxy host values", () => {
    expect(checkRequestOrigin("https://shop.example", "shop.example evil.example", "https", "production")).toBe("INVALID_ORIGIN");
  });
});
