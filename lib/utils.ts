import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
