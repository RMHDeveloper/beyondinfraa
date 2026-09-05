"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, RefreshCw, Loader2, Presentation, Mail, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import BulkPptModal from "./BulkPptModal";
import SendEmailModal from "./SendEmailModal";

type EmailStatus = { status: "sent" | "error"; to: string; subject: string; sentAt: string; error?: string };

type ExportHistoryEntry = {
  id: string;
  createdAt: string;
  user?: { name: string } | null;
  meta: { properties: { id: string; title: string; projectNumber: string }[]; email?: EmailStatus } | null;
};

type ExistingMatch = { id: string; confirmedAt: string | null; matchPct: number } | null;

type PropertySuggestion = {
  projectId: string; projectTitle: string; projectNumber: string;
  pct: number; matched: string[]; missed: string[];
  alreadyConfirmed: boolean; existingMatchId: string | null;
};

type PropertyItem = {
  id: string; projectNumber: string; title: string;
  existingMatch: ExistingMatch;
  suggestion?: PropertySuggestion;
};

export default function FindPropertiesPanel({
  demandProjectId,
}: {
  demandProjectId: string;
}) {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [clientEmail, setClientEmail] = useState("");
  const [emailTarget, setEmailTarget] = useState<ExportHistoryEntry | null>(null);
  const [errorPopup, setErrorPopup] = useState<string | null>(null);

  async function loadProject() {
    const res = await fetch(`/api/projects/${demandProjectId}`);
    if (res.ok) {
      const data = await res.json();
      setClientEmail(data.clientEmail ?? "");
    }
  }

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/projects/${demandProjectId}/find-properties`);
    const data: Array<PropertyItem & { existingMatch: ExistingMatch }> = res.ok ? await res.json() : [];
    setProperties(data);

    const pre = new Set<string>();
    for (const p of data) {
      if (p.existingMatch?.confirmedAt) pre.add(p.id);
    }
    setSelected(pre);
    setLoading(false);
  }

  async function loadHistory() {
    const res = await fetch(`/api/projects/${demandProjectId}/audit?action=EXPORT`);
    setHistory(res.ok ? await res.json() : []);
  }

  useEffect(() => { load(); loadHistory(); loadProject(); }, [demandProjectId]);

  async function runScan() {
    setScanning(true);
    const res = await fetch("/api/matching/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demandProjectId }),
    });
    if (res.ok) {
      const suggestions: PropertySuggestion[] = await res.json();
      const sugMap = new Map<string, PropertySuggestion>();
      for (const s of suggestions) sugMap.set(s.projectId, s);

      setProperties(prev => prev.map(p => ({ ...p, suggestion: sugMap.get(p.id) })));

      // Auto-select ≥60% matches
      setSelected(prev => {
        const next = new Set(prev);
        for (const s of suggestions) {
          if (s.pct >= 60 && !s.alreadyConfirmed) next.add(s.projectId);
        }
        return next;
      });
    }
    setScanning(false);
  }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  async function saveMatches() {
    setSaving(true);
    for (const p of properties) {
      const isSelected = selected.has(p.id);
      if (isSelected && !p.existingMatch?.confirmedAt) {
        await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: p.id, demandProjectId }),
        });
      } else if (!isSelected && p.existingMatch?.confirmedAt) {
        await fetch(`/api/matches/${p.existingMatch.id}`, { method: "DELETE" });
      }
    }
    await load();
    setSaving(false);
  }

  const confirmedCount = properties.filter(p => p.existingMatch?.confirmedAt).length;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-gray-400 flex-1">{confirmedCount} matched · {selected.size} selected</p>
        <button onClick={runScan} disabled={scanning}
          className="flex items-center gap-1.5 text-xs font-bold border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {scanning ? "Scanning…" : "Auto-scan & suggest"}
        </button>
        <button onClick={saveMatches} disabled={saving}
          className="flex items-center gap-1.5 text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save Matches"}
        </button>
        <button onClick={() => setShowExportModal(true)} disabled={selected.size === 0}
          className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Presentation className="w-3.5 h-3.5" />
          Export Bulk PPT
        </button>
      </div>

      {showExportModal && (
        <BulkPptModal
          demandProjectId={demandProjectId}
          properties={properties.filter(p => selected.has(p.id)).map(p => ({ id: p.id, projectNumber: p.projectNumber, title: p.title }))}
          onClose={() => setShowExportModal(false)}
          onDone={async () => {
            setShowExportModal(false);
            await load();
            await loadHistory();
          }}
        />
      )}

      {properties.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No active properties found.</p>
          <Link href="/projects/new" className="text-xs text-blue-600 font-bold hover:underline mt-2 inline-block">+ Add Property</Link>
        </div>
      )}

      <div className="space-y-2">
        {properties.map(p => {
          const isChecked = selected.has(p.id);
          const confirmed = !!p.existingMatch?.confirmedAt;
          const sug = p.suggestion;
          const borderColor = isChecked ? (confirmed ? "#059669" : "#2563eb") : "#e5e7eb";
          const bg = isChecked ? (confirmed ? "#f0fdf4" : "#eff6ff") : "white";
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
              className="w-full text-left rounded-xl border-2 p-3 transition-all hover:border-blue-300"
              style={{ borderColor, background: bg }}>
              <div className="flex items-start gap-3">
                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  isChecked ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-gray-400">{p.projectNumber}</span>
                    <span className="font-bold text-gray-900 text-sm truncate min-w-0">{p.title}</span>
                    {confirmed && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Matched</span>
                    )}
                  </div>
                  {sug && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                        sug.pct >= 80 ? "bg-green-100 text-green-700" : sug.pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-50 text-red-600")}>
                        {sug.pct}% match
                      </span>
                      {sug.matched.map(c => (
                        <span key={c} className="text-[10px] bg-green-50 text-green-700 px-1 py-0.5 rounded">✓ {c}</span>
                      ))}
                      {sug.missed.map(c => (
                        <span key={c} className="text-[10px] bg-red-50 text-red-600 px-1 py-0.5 rounded">✗ {c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {properties.length > 0 && (
        <p className="text-[10px] text-gray-400">
          Tick properties that match this requirement → Save Matches to confirm, or Export Bulk PPT to confirm and send details to the client. Use "Auto-scan" for score-based suggestions.
        </p>
      )}

      {history.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">EXPORT HISTORY</p>
          <div className="space-y-1.5">
            {history.map(h => {
              const email = h.meta?.email;
              return (
                <div key={h.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <Presentation className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-700">
                      {(h.meta?.properties ?? []).map(p => p.title).join(", ") || "—"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(h.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {h.user?.name ? ` · by ${h.user.name}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => email?.status === "error" && setErrorPopup(email.error ?? "Unknown error")}
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                      !email ? "bg-gray-100 text-gray-400" :
                      email.status === "sent" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700 cursor-pointer hover:bg-red-200"
                    )}
                  >
                    {!email ? "Not sent" : email.status === "sent" ? "Sent" : "Error"}
                  </button>
                  <button
                    onClick={() => setEmailTarget(h)}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 flex-shrink-0"
                  >
                    <Mail className="w-3 h-3" />
                    {email ? "Resend" : "Send Email"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {emailTarget && (
        <SendEmailModal
          demandProjectId={demandProjectId}
          auditLogId={emailTarget.id}
          defaultTo={emailTarget.meta?.email?.to || clientEmail}
          defaultSubject={emailTarget.meta?.email?.subject || `Properties for your review — ${(emailTarget.meta?.properties ?? []).map(p => p.title).join(", ")}`}
          defaultBody={"Hi,\n\nPlease find attached the property details for your review.\n\nRegards,\nBeyondInfra"}
          attachmentName={`${(emailTarget.meta?.properties ?? []).length} ${(emailTarget.meta?.properties ?? []).length === 1 ? "property" : "properties"}.pptx`}
          onClose={() => setEmailTarget(null)}
          onDone={async () => {
            setEmailTarget(null);
            await loadHistory();
          }}
        />
      )}

      {errorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setErrorPopup(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-gray-900">Email Failed</h2>
              </div>
              <button onClick={() => setErrorPopup(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">{errorPopup}</p>
          </div>
        </div>
      )}
    </div>
  );
}
