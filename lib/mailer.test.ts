import { describe, it, expect } from "vitest";
import { escapeHtml } from "./mailer";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("O'Brien")).toBe("O&#39;Brien");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Acme Towers, Phase 2")).toBe("Acme Towers, Phase 2");
  });

  it("neutralizes an injected <img onerror> payload", () => {
    const payload = `<img src=x onerror=alert(1)>`;
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain(">");
  });
});
