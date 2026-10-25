/** Accept JSON only; the login API has no need for arbitrary media-type parameters. */
export function isJsonContentType(value: string | null): boolean {
  if (value === null) return false;
  const parts = value.trim().split(";");
  if (parts.shift()?.trim().toLowerCase() !== "application/json") return false;
  if (parts.length === 0) return true;
  if (parts.length !== 1) return false;
  return /^\s*charset\s*=\s*(?:utf-8|"utf-8")\s*$/i.test(parts[0]);
}
