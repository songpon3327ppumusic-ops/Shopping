export type OriginCheckResult = "OK" | "ORIGIN_REQUIRED" | "INVALID_ORIGIN" | "CROSS_ORIGIN_REQUEST_BLOCKED";

/** Pure origin validation so security edge cases can be tested without Next.js runtime. */
export function checkRequestOrigin(
  origin: string | null,
  hostHeader: string | null,
  forwardedProtoHeader: string | null,
  nodeEnv: string | undefined,
): OriginCheckResult {
  if (!origin || !hostHeader) return "ORIGIN_REQUIRED";

  const host = hostHeader.split(",")[0].trim().toLowerCase();
  const proto = forwardedProtoHeader?.split(",")[0]?.trim().toLowerCase() ||
    (nodeEnv === "production" ? "https" : "http");

  // Reject ambiguous or malformed proxy-derived host/protocol values.
  if (!host || /[\\s/@?#]/.test(host) || !/^[a-z][a-z0-9+.-]*$/.test(proto)) {
    return "INVALID_ORIGIN";
  }

  try {
    const parsedOrigin = new URL(origin);
    if (
      (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") ||
      parsedOrigin.host.toLowerCase() !== host ||
      parsedOrigin.protocol !== `${proto}:` ||
      parsedOrigin.username !== "" ||
      parsedOrigin.password !== ""
    ) {
      return "CROSS_ORIGIN_REQUEST_BLOCKED";
    }
  } catch {
    return "INVALID_ORIGIN";
  }
  return "OK";
}
