import { describe, expect, it } from "vitest";
import { jsonBodyError, readJsonBodyLimited } from "../lib/request-body";

function requestWithBody(body: string, headers: Record<string, string> = {}) {
  return new Request("https://shop.example/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("readJsonBodyLimited", () => {
  it("parses valid JSON within the byte limit", async () => {
    const result = await readJsonBodyLimited(requestWithBody('{"ok":true}'), 32);
    expect(result).toEqual({ ok: true, value: { ok: true } });
  });

  it("rejects an oversized declared content length", async () => {
    const result = await readJsonBodyLimited(
      requestWithBody('{"ok":true}', { "content-length": "100" }),
      32,
    );
    expect(result).toEqual({ ok: false, kind: "TOO_LARGE" });
  });

  it("rejects oversized streamed bodies even without content length", async () => {
    const result = await readJsonBodyLimited(requestWithBody(JSON.stringify({ value: "x".repeat(128) })), 32);
    expect(result).toEqual({ ok: false, kind: "TOO_LARGE" });
  });

  it("rejects malformed JSON", async () => {
    const result = await readJsonBodyLimited(requestWithBody('{"ok":'), 32);
    expect(result).toEqual({ ok: false, kind: "INVALID_JSON" });
  });

  it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xc3, 0x28]));
        controller.close();
      },
    });
    const request = new Request("https://shop.example/api/test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    const result = await readJsonBodyLimited(request, 32);
    expect(result).toEqual({ ok: false, kind: "INVALID_JSON" });
  });

  it("returns safe HTTP status codes for body errors", async () => {
    const tooLarge = jsonBodyError("TOO_LARGE");
    const invalid = jsonBodyError("INVALID_JSON");
    expect(tooLarge.status).toBe(413);
    expect(invalid.status).toBe(400);
    expect(tooLarge.headers.get("cache-control")).toBe("no-store");
  });
});
