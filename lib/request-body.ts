import { NextResponse } from "next/server";

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; kind: "TOO_LARGE" | "INVALID_JSON" };

/**
 * Read a JSON request with an application-level byte cap.
 * Configure an edge/platform body limit too: application code is defense in depth.
 */
export async function readJsonBodyLimited(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0) {
      return { ok: false, kind: "INVALID_JSON" };
    }
    if (parsedLength > maxBytes) {
      try { await request.body?.cancel(); } catch { /* best effort */ }
      return { ok: false, kind: "TOO_LARGE" };
    }
  }

  if (!request.body) return { ok: false, kind: "INVALID_JSON" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, kind: "TOO_LARGE" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, kind: "INVALID_JSON" };
  }

  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, kind: "INVALID_JSON" };
  }
}

export function jsonBodyError(kind: "TOO_LARGE" | "INVALID_JSON") {
  return NextResponse.json(
    { error: kind === "TOO_LARGE" ? "REQUEST_TOO_LARGE" : "INVALID_JSON" },
    { status: kind === "TOO_LARGE" ? 413 : 400, headers: { "Cache-Control": "no-store" } },
  );
}
