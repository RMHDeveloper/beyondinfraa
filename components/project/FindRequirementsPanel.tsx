"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Building2, Check, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ExistingMatch = { id: string; confirmedAt: string | null; matchPct: number } | null;

type DemandProject = {
  id: string; projectNumber: string; title: string;
  subcategory: { name: string };
  clientContact: { name: string } | null;
  status: { name: string; color: string } | null;
  existingMatch: ExistingMatch;
};

export default function FindRequirementsPanel({ projectId }: { projectId: string }) {
  const [demandProjects, setDemandProjects] = useState<DemandProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, { pct: number; matched: string[]; missed: string[] }>>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/find-requirements`);
    if (res.ok) {
      const data: DemandProject[] = await res.json();
      setDemandProjects(data);
      const pre = new Set<string>();
      for (const p of data) {
        if (p.existingMatch?.confirmedAt) pre.add(p.id);
      }
      setSelected(pre);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [projectId]);

  async function runScan() {
    setScanning(true);
    const res = await fetch("/api/matching/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      const data = await res.json();
      const map: typeof suggestions = {};
      for (const s of data) {
        map[s.demandProjectId] = { pct: s.pct, matched: s.matched, missed: s.missed };
      }
      setSuggestions(map);
      // Auto-select high matches (≥60%) that aren't already confirmed
      setSelected(prev => {
        const next = new Set(prev);
        for (const s of data) {
          if (s.pct >= 60 && !s.alreadyConfirmed) next.add(s.demandProjectId);
        }
        return next;
      });
    }
    setScanning(false);
  }

  async function saveMatches() {
    setSaving(true);
    for (const p of demandProjects) {
      const isSelected = selected.has(p.id);
      if (isSelected && !p.existingMatch?.confirmedAt) {
        await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, demandProjectId: p.id }),
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

  const confirmedCount = demandProjects.filter(p => p.existingMatch?.confirmedAt).length;
  const selectedCount = selected.size;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  const buyerProjects = demandProjects.filter(p => p.subcategory.name === "Buy");
  const tenantProjects = demandProjects.filter(p => p.subcategory.name === "Tenant");
  const hasReqs = demandProjects.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">
            {confirmedCount} matched · {selectedCount} selected
          </p>
        </div>
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

      {!hasReqs && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No active requirements in this category yet.</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <Link href="/requirements/buyer" className="text-xs text-blue-600 font-bold hover:underline">+ Add Buyer Req</Link>
            <Link href="/requirements/tenant" className="text-xs text-amber-600 font-bold hover:underline">+ Add Tenant Req</Link>
          </div>
        </div>
      )}

      {/* Buyer requirements */}
      {buyerProjects.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Buyer Requirements ({buyerProjects.length})
          </p>
          <div className="space-y-2">
            {buyerProjects.map(p => (
              <RequirementRow
                key={p.id} project={p}
                suggestion={suggestions[p.id]} confirmed={!!p.existingMatch?.confirmedAt}
                checked={selected.has(p.id)} onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tenant requirements */}
      {tenantProjects.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Tenant Requirements ({tenantProjects.length})
          </p>
          <div className="space-y-2">
            {tenantProjects.map(p => (
              <RequirementRow
                key={p.id} project={p}
                suggestion={suggestions[p.id]} confirmed={!!p.existingMatch?.confirmedAt}
                checked={selected.has(p.id)} onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {hasReqs && (
        <p className="text-[10px] text-gray-400">
          Tick the requirements this property is relevant for → Save Matches. Use "Auto-scan" to get AI-suggested matches first.
        </p>
      )}
    </div>
  );
}

function RequirementRow({ project, suggestion, confirmed, checked, onToggle }: {
  project: DemandProject;
  suggestion?: { pct: number; matched: string[]; missed: string[] };
  confirmed: boolean; checked: boolean; onToggle: () => void;
}) {
  const borderColor = checked ? (confirmed ? "#059669" : "#2563eb") : "#e5e7eb";
  const bg = checked ? (confirmed ? "#f0fdf4" : "#eff6ff") : "white";

  return (
    <button onClick={onToggle}
      className="w-full text-left rounded-xl border-2 p-3 transition-all hover:border-blue-300"
      style={{ borderColor, background: bg }}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
          checked ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-gray-400">{project.projectNumber}</span>
            <span className="font-bold text-gray-900 text-sm">{project.clientContact?.name ?? project.title}</span>
            {confirmed && (
              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Matched</span>
            )}
          </div>

          {suggestion && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                suggestion.pct >= 80 ? "bg-green-100 text-green-700" : suggestion.pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-50 text-red-600")}>
                {suggestion.pct}% match
              </span>
              {suggestion.matched.map(c => (
                <span key={c} className="text-[10px] bg-green-50 text-green-700 px-1 py-0.5 rounded">✓ {c}</span>
              ))}
              {suggestion.missed.map(c => (
                <span key={c} className="text-[10px] bg-red-50 text-red-600 px-1 py-0.5 rounded">✗ {c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
