import { describe, expect, it } from "vitest";
import { isJsonContentType } from "../lib/content-type";

describe("isJsonContentType", () => {
  it("accepts JSON with optional parameters and case differences", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType(" Application/JSON; charset=utf-8 ")).toBe(true);
    expect(isJsonContentType("application/json; charset=\"utf-8\"")).toBe(true);
  });

  it("rejects missing and lookalike media types", () => {
    for (const value of [null, "", "text/json", "application/jsonp", "application/jsonx", "application/json ;oops", "application/json; charset=utf-8; boundary=x", "application/json; charset=iso-8859-1", "application/json; charset="]) {
      expect(isJsonContentType(value)).toBe(false);
    }
  });
});
