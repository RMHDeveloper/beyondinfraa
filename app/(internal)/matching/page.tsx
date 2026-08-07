"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Play, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchRow = {
  id: string;
  matchPct: number;
  confirmedAt: string | null;
  criteriaMatched: string[] | null;
  criteriaMissed: string[] | null;
  createdAt: string;
  project: { id: string; title: string; projectNumber: string; category: { name: string } };
  buyerRequirement: { id: string; reqNumber: string; contact: { name: string } } | null;
  tenantRequirement: { id: string; reqNumber: string; contact: { name: string } } | null;
};

type Filter = "all" | "buyer" | "tenant" | "confirmed" | "pending";

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
    if (filter === "buyer")     return !!m.buyerRequirement;
    if (filter === "tenant")    return !!m.tenantRequirement;
    if (filter === "confirmed") return !!m.confirmedAt;
    if (filter === "pending")   return !m.confirmedAt;
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",       label: `All (${matches.length})` },
    { key: "buyer",     label: `Buyer (${matches.filter(m => !!m.buyerRequirement).length})` },
    { key: "tenant",    label: `Tenant (${matches.filter(m => !!m.tenantRequirement).length})` },
    { key: "confirmed", label: `Confirmed (${matches.filter(m => !!m.confirmedAt).length})` },
    { key: "pending",   label: `Pending (${matches.filter(m => !m.confirmedAt).length})` },
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
              const req = m.buyerRequirement ?? m.tenantRequirement;
              const type = m.buyerRequirement ? "Buyer" : "Tenant";
              const reqHref = m.buyerRequirement
                ? `/requirements/buyer/${m.buyerRequirement.id}`
                : `/requirements/tenant/${m.tenantRequirement!.id}`;

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
                      {req?.contact.name}
                    </Link>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                        type === "Buyer" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                        {type}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">{req?.reqNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {m.confirmedAt
                        ? <span className="text-[10px] text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>
                        : <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" /> Pending</span>}
                    </div>
                  </div>

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
    </div>
  );
}
