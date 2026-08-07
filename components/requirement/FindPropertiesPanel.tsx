"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  reqId, reqType,
}: {
  reqId: string; reqType: "buyer" | "tenant";
}) {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/requirements/${reqType}/${reqId}/find-properties`);
    const data: Array<PropertyItem & { existingMatch: ExistingMatch }> = res.ok ? await res.json() : [];
    setProperties(data);

    const pre = new Set<string>();
    for (const p of data) {
      if (p.existingMatch?.confirmedAt) pre.add(p.id);
    }
    setSelected(pre);
    setLoading(false);
  }

  useEffect(() => { load(); }, [reqId]);

  async function runScan() {
    setScanning(true);
    const res = await fetch("/api/matching/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(reqType === "buyer" ? { buyerRequirementId: reqId } : { tenantRequirementId: reqId }),
      }),
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

  async function saveMatches() {
    setSaving(true);
    for (const p of properties) {
      const isSelected = selected.has(p.id);
      if (isSelected && !p.existingMatch?.confirmedAt) {
        await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: p.id,
            ...(reqType === "buyer" ? { buyerRequirementId: reqId } : { tenantRequirementId: reqId }),
          }),
        });
      } else if (!isSelected && p.existingMatch?.confirmedAt) {
        await fetch(`/api/matches/${p.existingMatch.id}`, { method: "DELETE" });
      }
    }
    await load();
    setSaving(false);
  }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

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
          className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save Matches"}
        </button>
      </div>

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
                    <span className="font-bold text-gray-900 text-sm truncate">{p.title}</span>
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
          Tick properties that match this requirement → Save Matches. Use "Auto-scan" for score-based suggestions.
        </p>
      )}
    </div>
  );
}
