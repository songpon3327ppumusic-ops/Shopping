/** Accept application/json and validate any optional media-type parameters. */
export function isJsonContentType(value: string | null): boolean {
  if (value === null) return false;
  const parts = value.trim().split(";");
  if (parts.shift()?.trim().toLowerCase() !== "application/json") return false;
  return parts.every((parameter) => {
    const equalsAt = parameter.indexOf("=");
    if (equalsAt <= 0 || parameter.slice(equalsAt + 1).trim().length === 0) return false;
    const name = parameter.slice(0, equalsAt).trim();
    return /^[!#$%&\x27*+.^_`|~0-9a-z-]+$/i.test(name) && !/[\r\n]/.test(parameter);
  });
}
