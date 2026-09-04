"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Play, ArrowRight, CheckCircle2, Clock, Award as AwardIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchRow = {
  id: string;
  matchPct: number;
  confirmedAt: string | null;
  criteriaMatched: string[] | null;
  criteriaMissed: string[] | null;
  createdAt: string;
  project: { id: string; title: string; projectNumber: string; category: { name: string } };
  demandProject: { id: string; projectNumber: string; clientContact: { name: string } | null; subcategory: { name: string } } | null;
  deal: { id: string } | null;
};

type Filter = "all" | "buyer" | "tenant" | "confirmed" | "pending" | "awarded";

const DEAL_TYPES = ["SOLD", "RENTED", "LEASED", "REDEVELOPMENT_CONFIRMED", "WITHDRAWN", "REQUIREMENT_CLOSED"];

function AwardModal({ match, onClose, onAwarded }: { match: MatchRow; onClose: () => void; onAwarded: () => void }) {
  const [dealType, setDealType] = useState(match.demandProject?.subcategory.name === "Buy" ? "SOLD" : "RENTED");
  const [finalPrice, setFinalPrice] = useState("");
  const [finalRent, setFinalRent] = useState("");
  const [closureDate, setClosureDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setSaving(true);
    const res = await fetch(`/api/projects/${match.project.id}/award`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, dealType, finalPrice, finalRent, closureDate, notes }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); setError(e.error ?? "Failed to award"); return; }
    onAwarded();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <p className="font-bold text-gray-900 text-sm">Award Match</p>
          <p className="text-xs text-gray-400 mt-0.5">{match.project.title} — {match.demandProject?.clientContact?.name}</p>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Deal Type</label>
          <select value={dealType} onChange={e => setDealType(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            {DEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Final Price (₹)</label>
            <input type="number" value={finalPrice} onChange={e => setFinalPrice(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Final Rent (₹/mo)</label>
            <input type="number" value={finalRent} onChange={e => setFinalRent(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Closure Date</label>
          <input type="date" value={closureDate} onChange={e => setClosureDate(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-xs font-bold text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="text-xs font-bold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {saving ? "Awarding…" : "Confirm Award"}
          </button>
        </div>
      </div>
    </div>
  );
}

function pctColor(pct: number) {
  if (pct >= 80) return "bg-green-50 text-green-700";
  if (pct >= 50) return "bg-blue-50 text-blue-700";
  if (pct >= 30) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-500";
}

export default function MatchingPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [awardTarget, setAwardTarget] = useState<MatchRow | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/matching");
    if (res.ok) setMatches(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runMatching() {
    setRunning(true);
    setRunResult(null);
    const res = await fetch("/api/matching/run", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      setRunResult(`${data.created} new match${data.created === 1 ? "" : "es"} found`);
      await load();
    }
    setRunning(false);
  }

  const filtered = matches.filter(m => {
    if (filter === "buyer")     return m.demandProject?.subcategory.name === "Buy";
    if (filter === "tenant")    return m.demandProject?.subcategory.name === "Tenant";
    if (filter === "confirmed") return !!m.confirmedAt;
    if (filter === "pending")   return !m.confirmedAt;
    if (filter === "awarded")   return !!m.deal;
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",       label: `All (${matches.length})` },
    { key: "buyer",     label: `Buyer (${matches.filter(m => m.demandProject?.subcategory.name === "Buy").length})` },
    { key: "tenant",    label: `Tenant (${matches.filter(m => m.demandProject?.subcategory.name === "Tenant").length})` },
    { key: "confirmed", label: `Confirmed (${matches.filter(m => !!m.confirmedAt).length})` },
    { key: "pending",   label: `Pending (${matches.filter(m => !m.confirmedAt).length})` },
    { key: "awarded",   label: `Awarded (${matches.filter(m => !!m.deal).length})` },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP › Matching</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" /> Match Results
          </h1>
        </div>
        <button onClick={runMatching} disabled={running}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {running
            ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</>
            : <><Play className="w-3.5 h-3.5" /> Run Matching</>}
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {runResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-700 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {runResult}
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors",
                filter === f.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600")}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No matches yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Run Matching" to score requirements against available properties.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => {
              const req = m.demandProject;
              const type = req?.subcategory.name === "Buy" ? "Buyer" : "Tenant";
              const reqHref = `/projects/${req?.id}`;

              return (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  {/* Match % */}
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold", pctColor(m.matchPct))}>
                    {m.matchPct}%
                  </div>

                  {/* Project */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/projects/${m.project.id}`}
                        className="font-bold text-gray-900 text-sm hover:text-blue-600 truncate">
                        {m.project.title}
                      </Link>
                      <span className="text-[10px] font-mono text-gray-400">{m.project.projectNumber}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">
                        {m.project.category.name}
                      </span>
                    </div>
                    {m.criteriaMatched && m.criteriaMatched.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.criteriaMatched.map(c => (
                          <span key={c} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                        {m.criteriaMissed?.map(c => (
                          <span key={c} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Requirement */}
                  <div className="text-right flex-shrink-0">
                    <Link href={reqHref} className="text-xs font-bold text-gray-700 hover:text-blue-600 block">
                      {req?.clientContact?.name}
                    </Link>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                        type === "Buyer" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                        {type}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">{req?.projectNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {m.deal
                        ? <span className="text-[10px] text-green-700 font-bold flex items-center gap-0.5"><AwardIcon className="w-3 h-3" /> Awarded</span>
                        : m.confirmedAt
                        ? <span className="text-[10px] text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>
                        : <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" /> Pending</span>}
                    </div>
                  </div>

                  {!m.deal && (
                    <button onClick={() => setAwardTarget(m)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 flex-shrink-0">
                      Award
                    </button>
                  )}

                  <Link href={`/projects/${m.project.id}?tab=Find+Buyers%2FTenants`}
                    className="text-gray-300 hover:text-blue-500 flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {awardTarget && (
        <AwardModal
          match={awardTarget}
          onClose={() => setAwardTarget(null)}
          onAwarded={() => { setAwardTarget(null); load(); }}
        />
      )}
    </div>
  );
}
