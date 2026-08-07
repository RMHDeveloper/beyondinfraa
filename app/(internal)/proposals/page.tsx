"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ProposalItem = {
  id: string;
  project: { id: string; title: string; projectNumber: string; category: { name: string } };
};
type Proposal = {
  id: string;
  proposalNumber: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  contact: { id: string; name: string };
  items: ProposalItem[];
  buyerRequirement: { reqNumber: string } | null;
  tenantRequirement: { reqNumber: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            "bg-gray-100 text-gray-500",
  SENT:             "bg-blue-50 text-blue-700",
  VIEWED:           "bg-purple-50 text-purple-700",
  RESPONSE_PENDING: "bg-amber-50 text-amber-700",
  INTERESTED:       "bg-teal-50 text-teal-700",
  SITE_VISIT_DONE:  "bg-cyan-50 text-cyan-700",
  NEGOTIATING:      "bg-orange-50 text-orange-700",
  ACCEPTED:         "bg-green-100 text-green-700",
  REJECTED:         "bg-red-50 text-red-600",
  EXPIRED:          "bg-gray-100 text-gray-400",
};

const SECTOR_COLORS: Record<string, string> = {
  Residential: "#2563eb", Commercial: "#d97706",
  Industrial: "#7c3aed", Redevelopment: "#0d9488",
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetch("/api/proposals").then(r => r.json()).then(d => {
      setProposals(d);
      setLoading(false);
    });
  }, []);

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      p.proposalNumber.toLowerCase().includes(q) ||
      p.contact.name.toLowerCase().includes(q) ||
      p.items.some(i => i.project.title.toLowerCase().includes(q));
    const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["ALL", ...Object.keys(STATUS_COLORS)];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 h-12 flex items-center gap-3 flex-shrink-0">
        <FileText className="w-4 h-4 text-pink-600 flex-shrink-0" />
        <h1 className="text-sm font-bold text-gray-900">Proposals</h1>
        <span className="text-xs text-gray-400">({proposals.length})</span>
        <div className="flex-1" />
        <Link href="/proposals/new"
          className="flex items-center gap-1.5 bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-pink-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Proposal
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by contact, number, property…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-400" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto flex-shrink-0">
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors",
                filterStatus === s
                  ? "bg-pink-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
              {s === "ALL" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {proposals.length === 0 ? "No proposals yet." : "No proposals match your search."}
            </p>
            {proposals.length === 0 && (
              <Link href="/proposals/new"
                className="inline-block mt-3 text-xs font-bold text-pink-600 hover:underline">
                Create your first proposal →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const reqNumber = p.buyerRequirement?.reqNumber ?? p.tenantRequirement?.reqNumber ?? null;
              return (
                <Link key={p.id} href={`/proposals/${p.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-pink-200 hover:bg-pink-50/20 transition-all">
                  <div className="flex items-start gap-3">
                    {/* Left icon */}
                    <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-pink-500" />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {p.proposalNumber}
                        </span>
                        {reqNumber && (
                          <span className="font-mono text-[10px] text-gray-400">{reqNumber}</span>
                        )}
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500")}>
                          {p.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm mt-1">{p.contact.name}</p>
                      {p.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.items.map(item => {
                            const color = SECTOR_COLORS[item.project.category.name] ?? "#64748b";
                            return (
                              <span key={item.id}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                                style={{ borderColor: color + "40", color, background: color + "10" }}>
                                {item.project.projectNumber} · {item.project.title}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right meta */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-gray-400">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {p.sentAt && (
                        <p className="text-[10px] text-blue-500 mt-0.5">
                          Sent {new Date(p.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{p.items.length} propert{p.items.length === 1 ? "y" : "ies"}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
