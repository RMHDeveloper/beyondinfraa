import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WheelEvent } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Prevents accidental value changes when the user scrolls the mouse wheel over a
// focused number input — blur it so the wheel scrolls the page instead.
export function blurOnWheel(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}

export function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function generateProjectNumber(category: string, id: string) {
  const prefix = category.slice(0, 3).toUpperCase();
  const suffix = id.slice(-6).toUpperCase();
  return `BI-${prefix}-${suffix}`;
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

// Wraps a route handler so unexpected throws (Prisma errors, requireSession()
// throwing "Unauthorized", etc.) become a JSON error response instead of
// Next's default HTML/text 500 — which breaks every caller doing res.json().
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof Error && e.message === "Unauthorized") {
        return apiError("Unauthorized", 401);
      }
      console.error(e);
      return apiError("Internal server error", 500);
    }
  };
}

// REPEATER values are stored as a JSON string of rows even when every cell is blank
// (e.g. `[{"Name":"","Phone":"","Email":""}]`) — treat that as empty instead of raw JSON.
export function isBlankResponseValue(value: string | null | undefined, fieldType: string): boolean {
  if (!value) return true;
  if (fieldType !== "REPEATER") return value.trim() === "";
  try {
    const rows = JSON.parse(value);
    if (!Array.isArray(rows)) return true;
    return rows.every((row) =>
      row && typeof row === "object"
        ? Object.values(row).every((v) => !v || String(v).trim() === "")
        : true
    );
  } catch {
    return true;
  }
}

// Renders a response's value as a short human-readable string for audit logs —
// REPEATER rows become "Name: X, Phone: Y" per row (joined by " · "), MULTISELECT
// arrays become a comma list, everything else falls back to the plain text value.
export function formatResponseValue(value: string | null, jsonValue: unknown, fieldType: string): string {
  if (fieldType === "REPEATER" && Array.isArray(jsonValue)) {
    const rows = (jsonValue as Record<string, string>[])
      .map((row) => Object.entries(row).filter(([, v]) => v && String(v).trim() !== "").map(([k, v]) => `${k}: ${v}`).join(", "))
      .filter((r) => r !== "");
    return rows.length > 0 ? rows.join(" · ") : "—";
  }
  if (fieldType === "MULTISELECT" && Array.isArray(jsonValue)) {
    return (jsonValue as string[]).filter(Boolean).join(", ") || "—";
  }
  return value && value.trim() !== "" ? value : "—";
}

export function normalizePhone(s: string): string {
  return s.replace(/\D/g, "").slice(-10);
}

// Subcategory names are stored/matched as "Redevelopment" in the database — this only
// swaps the display text to "Joint Development" wherever a subcategory name is shown to a user.
export function subcategoryLabel(name: string): string {
  return name === "Redevelopment" ? "Joint Development" : name;
}
