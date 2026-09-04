import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./auth";

describe("signToken / verifyToken", () => {
  const payload = { userId: "u1", name: "Jane", email: "jane@example.com", role: "ADMIN" };

  it("round-trips a valid token", () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it("returns null for a malformed token", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
  });

  it("returns null for a tampered token", () => {
    const token = signToken(payload);
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for a token signed with a different secret", () => {
    const jwt = require("jsonwebtoken");
    const foreignToken = jwt.sign(payload, "wrong-secret");
    expect(verifyToken(foreignToken)).toBeNull();
  });
});
