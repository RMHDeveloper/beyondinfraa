"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

type AuditEntry = {
  id: string; action: string; entityType: string | null;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user?: { name: string } | null;
};

function isRestorable(e: AuditEntry): boolean {
  return e.action === "UPDATE" && e.entityType === "response" && !!e.meta?.beforeRaw;
}

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
  AWARD:        { label: "Awarded",        color: "#059669", bg: "#ecfdf5" },
  EXPORT:       { label: "Exported",       color: "#7c3aed", bg: "#f5f3ff" },
};

type Change = { label: string; before: unknown; after: unknown };

// New entries store a readable {label, before, after} (or {changes:[...]} for
// multi-field saves) in `meta`. Older entries (pre-fix) only have raw before/after
// JSON blobs — fall back to a generic key-diff for those so history isn't blank.
function changesFor(e: AuditEntry): Change[] {
  const meta = e.meta;
  if (meta && Array.isArray(meta.changes)) return meta.changes as Change[];
  if (meta && typeof meta.label === "string") return [{ label: meta.label as string, before: meta.before, after: meta.after }];

  if (!e.after) return [];
  const keys = Object.keys(e.after);
  return keys.map(k => ({
    label: k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
    before: e.before?.[k] ?? null,
    after: e.after?.[k] ?? null,
  }));
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Cluster = { entries: AuditEntry[]; changes: Change[]; action: string; createdAt: string; user?: { name: string } | null; source?: string };

// Groups consecutive entries by day, then clusters entries from the same actor +
// action that landed within the same minute into one card (e.g. saving a multi-field
// form fires one PATCH per field — shouldn't read as 10 separate log lines).
function clusterByDay(entries: AuditEntry[]): { day: string; clusters: Cluster[] }[] {
  const days: { day: string; clusters: Cluster[] }[] = [];

  for (const e of entries) {
    const d = new Date(e.createdAt);
    const day = dayLabel(d);
    const minuteKey = `${d.toDateString()}-${d.getHours()}-${d.getMinutes()}`;
    const source = (e.meta?.source as string | undefined) ?? undefined;

    let dayGroup = days.find(g => g.day === day);
    if (!dayGroup) { dayGroup = { day, clusters: [] }; days.push(dayGroup); }

    const last = dayGroup.clusters[dayGroup.clusters.length - 1];
    const lastMinuteKey = last ? `${new Date(last.createdAt).toDateString()}-${new Date(last.createdAt).getHours()}-${new Date(last.createdAt).getMinutes()}` : null;
    const canMerge = last && last.action === e.action && (last.user?.name ?? null) === (e.user?.name ?? null) && last.source === source && lastMinuteKey === minuteKey && e.action === "UPDATE";

    if (canMerge && last) {
      last.entries.push(e);
      last.changes.push(...changesFor(e));
    } else {
      dayGroup.clusters.push({ entries: [e], changes: changesFor(e), action: e.action, createdAt: e.createdAt, user: e.user, source });
    }
  }

  return days;
}

export default function AuditTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  function load() {
    fetch(`/api/projects/${projectId}/audit`).then(r => r.json()).then(setEntries);
  }

  useEffect(() => { load(); }, [projectId]);

  async function restore(auditId: string) {
    if (!confirm("Restore this field to its earlier value?")) return;
    setRestoringId(auditId);
    const res = await fetch(`/api/projects/${projectId}/audit/${auditId}/restore`, { method: "POST" });
    setRestoringId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Failed to restore");
      return;
    }
    load();
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No activity yet.</p>
      </div>
    );
  }

  const days = clusterByDay(entries);

  return (
    <div className="space-y-5">
      {days.map(({ day, clusters }) => (
        <div key={day}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{day}</p>
          <div className="relative pl-6 space-y-0">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200" />
            {clusters.map(c => {
              const meta = ACTION_META[c.action] ?? { label: c.action, color: "#9ca3af", bg: "#f9fafb" };
              return (
                <div key={c.entries[0].id} className="relative flex items-start gap-3 pb-4">
                  <div className="absolute -left-3.5 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ borderColor: meta.color, color: meta.color, top: "2px" }}>
                    {c.action === "CREATE" ? "✦" : c.action === "UPDATE" ? "✎" : c.action === "LOCK" ? "🔒" : "•"}
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}{c.changes.length > 1 ? ` · ${c.changes.length} fields` : ""}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(c.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {c.changes.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {c.changes.map((ch, i) => (
                          <p key={i} className="text-xs text-gray-700 leading-relaxed break-words">
                            <span className="font-medium">{ch.label}:</span>{" "}
                            {ch.before && fmt(ch.before) !== "—" ? <>{fmt(ch.before)} → {fmt(ch.after)}</> : fmt(ch.after)}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <p className="text-[10px] text-gray-400">
                        by {c.user?.name ?? (c.source === "client" ? "Client" : "System")}
                      </p>
                      {c.entries.length === 1 && isRestorable(c.entries[0]) && (
                        <button
                          onClick={() => restore(c.entries[0].id)}
                          disabled={restoringId === c.entries[0].id}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 flex-shrink-0"
                        >
                          {restoringId === c.entries[0].id ? "Restoring…" : "Restore"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
