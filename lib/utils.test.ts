import { describe, it, expect } from "vitest";
import { normalizePhone, withErrorHandling, apiError } from "./utils";

describe("normalizePhone", () => {
  it("strips non-digits and keeps the last 10 digits", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
  });

  it("keeps a bare 10-digit number unchanged", () => {
    expect(normalizePhone("9876543210")).toBe("9876543210");
  });

  it("returns a short string unchanged if under 10 digits", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });
});

describe("withErrorHandling", () => {
  it("passes through a successful response", async () => {
    const handler = withErrorHandling(async () => Response.json({ ok: true }));
    const res = await handler();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("converts an Unauthorized throw into a 401 JSON error", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("Unauthorized");
    });
    const res = await handler();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("converts an unexpected throw into a 500 JSON error", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("boom");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("forwards handler arguments unchanged", async () => {
    const handler = withErrorHandling(async (a: number, b: string) => {
      return apiError(`${a}-${b}`, 418);
    });
    const res = await handler(7, "x");
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: "7-x" });
  });
});
