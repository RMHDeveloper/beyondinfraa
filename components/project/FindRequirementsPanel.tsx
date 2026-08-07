"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Building2, Check, X, Plus, RefreshCw, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type ExistingMatch = { id: string; confirmedAt: string | null; matchPct: number } | null;

type BuyerReq = {
  id: string; reqNumber: string; status: string;
  budgetMin: number | null; budgetMax: number | null;
  areaMin: number | null; areaMax: number | null;
  bhk: string | null; preferredLocations: unknown;
  contact: { id: string; name: string };
  existingMatch: ExistingMatch;
};
type TenantReq = {
  id: string; reqNumber: string; status: string;
  rentMin: number | null; rentMax: number | null;
  areaMin: number | null; areaMax: number | null;
  contact: { id: string; name: string };
  existingMatch: ExistingMatch;
};

export default function FindRequirementsPanel({ projectId }: { projectId: string }) {
  const [buyerReqs, setBuyerReqs] = useState<BuyerReq[]>([]);
  const [tenantReqs, setTenantReqs] = useState<TenantReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, { pct: number; matched: string[]; missed: string[] }>>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/find-requirements`);
    if (res.ok) {
      const data = await res.json();
      setBuyerReqs(data.buyerReqs);
      setTenantReqs(data.tenantReqs);
      // Pre-select already confirmed
      const pre = new Set<string>();
      for (const r of [...data.buyerReqs, ...data.tenantReqs]) {
        if (r.existingMatch?.confirmedAt) pre.add(r.id);
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
        map[s.reqId] = { pct: s.pct, matched: s.matched, missed: s.missed };
      }
      setSuggestions(map);
      // Auto-select high matches (≥60%) that aren't already confirmed
      setSelected(prev => {
        const next = new Set(prev);
        for (const s of data) {
          if (s.pct >= 60 && !s.alreadyConfirmed) next.add(s.reqId);
        }
        return next;
      });
    }
    setScanning(false);
  }

  async function saveMatches() {
    setSaving(true);
    const allReqs = [
      ...buyerReqs.map(r => ({ id: r.id, type: "buyer" as const })),
      ...tenantReqs.map(r => ({ id: r.id, type: "tenant" as const })),
    ];

    for (const r of allReqs) {
      const isSelected = selected.has(r.id);
      const req = r.type === "buyer"
        ? buyerReqs.find(x => x.id === r.id)
        : tenantReqs.find(x => x.id === r.id);

      if (isSelected && !req?.existingMatch?.confirmedAt) {
        // Create or confirm
        await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            ...(r.type === "buyer" ? { buyerRequirementId: r.id } : { tenantRequirementId: r.id }),
          }),
        });
      } else if (!isSelected && req?.existingMatch?.confirmedAt) {
        // Remove confirmed match
        await fetch(`/api/matches/${req.existingMatch.id}`, { method: "DELETE" });
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

  const confirmedCount = [...buyerReqs, ...tenantReqs].filter(r => r.existingMatch?.confirmedAt).length;
  const selectedCount = selected.size;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  const hasReqs = buyerReqs.length > 0 || tenantReqs.length > 0;

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
            <Link href="/requirements/buyer/new" className="text-xs text-blue-600 font-bold hover:underline">+ Add Buyer Req</Link>
            <Link href="/requirements/tenant/new" className="text-xs text-amber-600 font-bold hover:underline">+ Add Tenant Req</Link>
          </div>
        </div>
      )}

      {/* Buyer requirements */}
      {buyerReqs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Buyer Requirements ({buyerReqs.length})
          </p>
          <div className="space-y-2">
            {buyerReqs.map(r => {
              const isChecked = selected.has(r.id);
              const sug = suggestions[r.id];
              const confirmed = !!r.existingMatch?.confirmedAt;
              return (
                <RequirementRow
                  key={r.id} id={r.id} reqNumber={r.reqNumber}
                  contactName={r.contact.name} type="buyer"
                  budget={r.budgetMin && r.budgetMax ? `₹${(r.budgetMin/1e7).toFixed(1)}–${(r.budgetMax/1e7).toFixed(1)}Cr` : null}
                  area={r.areaMin && r.areaMax ? `${r.areaMin}–${r.areaMax} sqft` : null}
                  extra={r.bhk ?? null}
                  locations={Array.isArray(r.preferredLocations) ? r.preferredLocations as string[] : []}
                  suggestion={sug} confirmed={confirmed}
                  checked={isChecked} onToggle={() => toggle(r.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Tenant requirements */}
      {tenantReqs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Tenant Requirements ({tenantReqs.length})
          </p>
          <div className="space-y-2">
            {tenantReqs.map(r => {
              const isChecked = selected.has(r.id);
              const sug = suggestions[r.id];
              const confirmed = !!r.existingMatch?.confirmedAt;
              return (
                <RequirementRow
                  key={r.id} id={r.id} reqNumber={r.reqNumber}
                  contactName={r.contact.name} type="tenant"
                  budget={r.rentMin && r.rentMax ? `₹${r.rentMin.toLocaleString()}–${r.rentMax.toLocaleString()}/mo` : null}
                  area={r.areaMin && r.areaMax ? `${r.areaMin}–${r.areaMax} sqft` : null}
                  extra={null}
                  locations={[]}
                  suggestion={sug} confirmed={confirmed}
                  checked={isChecked} onToggle={() => toggle(r.id)}
                />
              );
            })}
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

function RequirementRow({ id, reqNumber, contactName, type, budget, area, extra, locations, suggestion, confirmed, checked, onToggle }: {
  id: string; reqNumber: string; contactName: string; type: "buyer" | "tenant";
  budget: string | null; area: string | null; extra: string | null; locations: string[];
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
            <span className="font-mono text-[10px] text-gray-400">{reqNumber}</span>
            <span className="font-bold text-gray-900 text-sm">{contactName}</span>
            {confirmed && (
              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Matched</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {budget && <span className="text-[10px] text-gray-500">{budget}</span>}
            {area && <span className="text-[10px] text-gray-500">{area}</span>}
            {extra && <span className="text-[10px] text-gray-500">{extra}</span>}
            {locations.slice(0, 3).map(l => (
              <span key={l} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l}</span>
            ))}
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
