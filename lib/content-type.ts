/** Accept application/json with optional parameters, rejecting lookalike media types. */
export function isJsonContentType(value: string | null): boolean {
  return value !== null && /^application\/json(?:\s*;|$)/i.test(value.trim());
}
