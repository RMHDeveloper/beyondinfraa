"use client";

import { useEffect, useState } from "react";

type AuditEntry = {
  id: string; action: string; entityType: string | null;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  user?: { name: string } | null;
};

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  CREATE:       { label: "Created",        color: "#059669", bg: "#ecfdf5" },
  UPDATE:       { label: "Updated",        color: "#2563eb", bg: "#eff6ff" },
  DELETE:       { label: "Deleted",        color: "#dc2626", bg: "#fff1f2" },
  LOCK:         { label: "Locked",         color: "#d97706", bg: "#fffbeb" },
  UNLOCK:       { label: "Unlocked",       color: "#6b7280", bg: "#f9fafb" },
  ARCHIVE:      { label: "Archived",       color: "#6b7280", bg: "#f1f5f9" },
  FILE_UPLOAD:  { label: "File uploaded",  color: "#7c3aed", bg: "#f5f3ff" },
  FILE_DELETE:  { label: "File deleted",   color: "#dc2626", bg: "#fff1f2" },
  OTP_SENT:     { label: "OTP sent",       color: "#0891b2", bg: "#f0f9ff" },
  OTP_VERIFIED: { label: "Client verified",color: "#059669", bg: "#ecfdf5" },
};

function diffSummary(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string | null {
  if (!after) return null;
  const keys = Object.keys(after);
  if (keys.length === 0) return null;

  // Single field update — most common
  if (keys.length === 1) {
    const k = keys[0];
    const newVal = String(after[k] ?? "—");
    const oldVal = before?.[k] != null ? String(before[k]) : null;
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    if (oldVal) return `${label}: "${oldVal}" → "${newVal}"`;
    return `${label} set to "${newVal}"`;
  }

  // Multiple fields — list them
  return keys.map(k => {
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    return `${label}: ${String(after[k] ?? "—")}`;
  }).join(" · ");
}

export default function AuditTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/audit`).then(r => r.json()).then(setEntries);
  }, [projectId]);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No activity recorded yet.</p>;
  }

  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200" />
      {entries.map(e => {
        const meta = ACTION_META[e.action] ?? { label: e.action, color: "#9ca3af", bg: "#f9fafb" };
        const summary = diffSummary(e.before, e.after);
        return (
          <div key={e.id} className="relative flex items-start gap-3 pb-4">
            <div className="absolute -left-3.5 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{ borderColor: meta.color, color: meta.color, top: "2px" }}>
              {e.action === "CREATE" ? "✦" : e.action === "UPDATE" ? "✎" : e.action === "LOCK" ? "🔒" : "•"}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                  {new Date(e.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {summary && (
                <p className="text-xs text-gray-700 leading-relaxed mt-1 break-words">{summary}</p>
              )}
              {e.user?.name && (
                <p className="text-[10px] text-gray-400 mt-1">by {e.user.name}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
