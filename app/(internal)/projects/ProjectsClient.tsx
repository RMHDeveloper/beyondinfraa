"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, Printer,
  Building2, Users, FileText, MapPin, TrendingUp,
  CheckCircle2, Target, Send, Eye, ThumbsUp, ThumbsDown, RefreshCw, Loader2, Copy, ArrowRight, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type Project = {
  id: string; projectNumber: string; title: string; state: string;
  clientName: string | null; potentialScore: number | null;
  category: { name: string };
  subcategory: { name: string };
  status: { name: string; color: string } | null;
};

type Contact = { id: string; name: string; type: string };
type Category = { id: string; name: string };

type BuyerReq = {
  id: string; projectNumber: string; title: string; state: string;
  clientContact: Contact | null; clientName: string | null; clientPhone: string | null;
  category: Category;
  createdAt: Date | string;
  demandMatches: { id: string }[];
};
type TenantReq = {
  id: string; projectNumber: string; title: string; state: string;
  clientContact: Contact | null; clientName: string | null; clientPhone: string | null;
  category: Category;
  createdAt: Date | string;
  demandMatches: { id: string }[];
};
type Match = {
  id: string; matchPct: number; alreadySent: boolean;
  isManual: boolean; confirmedAt: Date | string | null;
  criteriaMatched: unknown; criteriaMissed: unknown;
  project: { id: string; title: string; projectNumber: string };
  demandProjectId: string | null;
};
type ProposalItem = { project: { id: string; title: string }; response: string };
type Proposal = {
  id: string; proposalNumber: string; status: string;
  contact: Contact; items: ProposalItem[];
  createdAt: Date | string;
};
type SiteVisit = {
  id: string; status: string; notes: string | null; scheduledAt: Date | string; segment: string | null;
  contact: Contact | null; project: { id: string; title: string } | null;
};
type Deal = {
  id: string; type: string; finalPrice: number | null; finalRent: number | null; closureDate: Date | string | null;
  contact: Contact; project: { id: string; title: string; category: Category };
};

type Props = {
  projects: Project[];
  buyerReqs: BuyerReq[];
  tenantReqs: TenantReq[];
  contacts: Contact[];
  categories: Category[];
  matches: Match[];
  proposals: Proposal[];
  siteVisits: SiteVisit[];
  deals: Deal[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, { color: string; bg: string }> = {
  Residential:   { color: "#2563eb", bg: "#eff6ff" },
  Commercial:    { color: "#d97706", bg: "#fffbeb" },
  Industrial:    { color: "#7c3aed", bg: "#f5f3ff" },
  Redevelopment: { color: "#0d9488", bg: "#f0fdfa" },
  "Special Projects": { color: "#0d9488", bg: "#f0fdfa" },
};
// The "Redevelopment" sector shown in nav/filters maps to the real Category name
// "Special Projects" (which holds the Redevelopment + Joint Venture subcategories).
const SECTOR_TO_CATEGORY: Record<string, string> = { Redevelopment: "Special Projects" };
// Display label for a sector key, where it differs from the key itself (e.g. URL/lookup key stays "Redevelopment").
const SECTOR_DISPLAY_LABEL: Record<string, string> = { Redevelopment: "Joint Development" };
const TX_COLORS: Record<string, { color: string; bg: string }> = {
  Sale:          { color: "#2563eb", bg: "#eff6ff" },
  Rent:          { color: "#d97706", bg: "#fffbeb" },
  Buy:           { color: "#0d9488", bg: "#f0fdfa" },
  Tenant:        { color: "#c2410c", bg: "#fff7ed" },
  "Joint Venture": { color: "#7c3aed", bg: "#f5f3ff" },
};
const AVAIL_COLORS: Record<string, { color: string; bg: string }> = {
  OPEN:     { color: "#059669", bg: "#ecfdf5" },
  LOCKED:   { color: "#d97706", bg: "#fffbeb" },
  ARCHIVED: { color: "#64748b", bg: "#f1f5f9" },
};
const REQ_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  LOCKED: "bg-amber-50 text-amber-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};
const MATCH_COLORS = (pct: number) => pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626";
const VISIT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700", COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700", RESCHEDULED: "bg-amber-50 text-amber-700",
};
const SEGMENT_LABELS: Record<string, string> = {
  BUY: "Buy", SELL: "Sell", RENT: "Rent", REDEVELOPMENT: "Joint Development", JV: "JV",
};
const DEAL_TYPE_COLORS: Record<string, string> = {
  SOLD: "bg-blue-50 text-blue-700", RENTED: "bg-amber-50 text-amber-700",
  LEASED: "bg-purple-50 text-purple-700", REDEVELOPMENT_CONFIRMED: "bg-pink-50 text-pink-700",
  WITHDRAWN: "bg-red-50 text-red-700", REQUIREMENT_CLOSED: "bg-teal-50 text-teal-700",
};
function dealTypeLabel(t: string) {
  return t === "REDEVELOPMENT_CONFIRMED" ? "JOINT DEVELOPMENT CONFIRMED" : t.replace(/_/g, " ");
}
function subtypeLabel(name: string) {
  const first = name.split(" ")[0];
  return first === "Redevelopment" ? "Joint Development" : first;
}

const SUB_TABS = [
  "Overview", "Inventory", "Buyer Requirements", "Tenant Requirements",
  "Matching", "Proposals", "Site Visits", "Closed Deals",
] as const;
type SubTab = typeof SUB_TABS[number];

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectsClient({
  projects, buyerReqs, tenantReqs, contacts,
  matches, proposals, siteVisits, deals,
}: Props) {
  const router = useRouter();

  const sp = useSearchParams();

  const catParam = sp.get("cat") ?? "All";
  const tabParam = (sp.get("tab") as SubTab | null) ?? "Inventory";

  const [activeTab, setActiveTab] = useState<SubTab>("Inventory");
  const [txFilter, setTxFilter] = useState<"All" | "For Sale" | "For Rent">("All");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Browser back/forward can restore this page from Next's router cache with whatever
  // project list was current when it was cached — e.g. before a project was just
  // created or duplicated. Force a fresh server fetch every time this page mounts so
  // returning here (via back button or otherwise) never shows stale data.
  useEffect(() => {
    router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function duplicateProject(e: React.MouseEvent, projectId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Create a duplicate of this property with all its current field values?")) return;
    setDuplicatingId(projectId);
    const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
    setDuplicatingId(null);
    if (!res.ok) { alert("Failed to duplicate property"); return; }
    const created = await res.json();
    // Bust the router cache for this list so navigating back here (e.g. to duplicate
    // the next flat) doesn't show a stale snapshot from before the duplicate existed.
    router.refresh();
    router.push(`/projects/${created.projectNumber}`);
  }

  async function deleteProject(e: React.MouseEvent, projectId: string, label: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${label}"? This permanently removes the record and cannot be undone.`)) return;
    setDeletingId(projectId);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Failed to delete");
      return;
    }
    router.refresh();
  }

  useEffect(() => {
    const t = sp.get("tab") as SubTab | null;
    if (t && SUB_TABS.includes(t)) setActiveTab(t);
  }, [sp]);

  function handleTabClick(tab: SubTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/projects?${params.toString()}`, { scroll: false });
  }

  const effectiveCat = catParam === "All" ? "All" : (SECTOR_TO_CATEGORY[catParam] ?? catParam);
  const catFiltered = effectiveCat === "All" ? projects : projects.filter((p) => p.category.name === effectiveCat);
  const filteredProjects = catFiltered.filter((p) => {
    if (p.subcategory.name === "Buy" || p.subcategory.name === "Tenant") return false;
    if (txFilter === "For Sale") return p.subcategory.name.includes("Sale") || p.subcategory.name.includes("Buy");
    if (txFilter === "For Rent") return p.subcategory.name.includes("Rent");
    return true;
  });
  const total = filteredProjects.length;
  const sectorColor = catParam !== "All" ? (SECTOR_COLORS[catParam]?.color ?? "#2563eb") : "#2563eb";

  const filteredBuyerReqs = effectiveCat === "All" ? buyerReqs : buyerReqs.filter((r) => r.category.name === effectiveCat);
  const filteredTenantReqs = effectiveCat === "All" ? tenantReqs : tenantReqs.filter((r) => r.category.name === effectiveCat);
  const filteredMatches = effectiveCat === "All" ? matches : matches.filter((m) => filteredBuyerReqs.some((r) => r.id === m.demandProjectId) || filteredTenantReqs.some((r) => r.id === m.demandProjectId));
  const filteredProposals = effectiveCat === "All" ? proposals : proposals.filter((p) => p.items.some((it) => catFiltered.some((cp) => cp.id === it.project.id)));
  const filteredSiteVisits = effectiveCat === "All" ? siteVisits : siteVisits.filter((v) => v.project && catFiltered.some((cp) => cp.id === v.project!.id));
  const filteredDeals = effectiveCat === "All" ? deals : deals.filter((d) => d.project.category.name === effectiveCat);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Category header bar */}
      {catParam !== "All" && (
        <div className="bg-white border-b border-gray-100 px-3 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: SECTOR_COLORS[catParam]?.bg, color: SECTOR_COLORS[catParam]?.color }}>
            {SECTOR_DISPLAY_LABEL[catParam] ?? catParam}
          </span>
          <span className="text-xs text-gray-400 hidden sm:inline">Showing {catFiltered.length} records in this category</span>
          <Link href="/projects" className="ml-auto text-xs text-gray-400 hover:text-gray-700 underline">View All</Link>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center gap-0 overflow-x-auto no-scrollbar flex-shrink-0">
        {SUB_TABS.map((tab) => (
          <button key={tab} onClick={() => handleTabClick(tab)}
            className={cn("px-3 sm:px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
              activeTab === tab ? "text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800")}
            style={activeTab === tab ? { borderColor: sectorColor, color: sectorColor } : undefined}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {activeTab === "Overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Properties", value: catFiltered.length, color: sectorColor, bg: "#eff6ff" },
                { label: "Available", value: catFiltered.filter((p) => p.state === "OPEN").length, color: "#059669", bg: "#ecfdf5" },
                { label: "Reserved", value: catFiltered.filter((p) => p.state === "LOCKED").length, color: "#d97706", bg: "#fffbeb" },
                { label: "Closed", value: catFiltered.filter((p) => p.state === "ARCHIVED").length, color: "#64748b", bg: "#f1f5f9" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                  <div className="mt-3 h-1 rounded-full" style={{ background: bg }}>
                    <div className="h-1 rounded-full" style={{ background: color, width: `${catFiltered.length > 0 ? (value / catFiltered.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Buyer Requirements", value: filteredBuyerReqs.length, icon: Users, color: "#2563eb" },
                { label: "Tenant Requirements", value: filteredTenantReqs.length, icon: Building2, color: "#d97706" },
                { label: "Proposals", value: filteredProposals.length, icon: FileText, color: "#7c3aed" },
                { label: "Deals Closed", value: filteredDeals.length, icon: TrendingUp, color: "#059669" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AVAILABLE PROPERTIES ─────────────────────────── */}
        {activeTab === "Inventory" && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                {(["All", "For Sale", "For Rent"] as const).map((f) => (
                  <button key={f} onClick={() => setTxFilter(f)}
                    className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
                      txFilter === f ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 border border-gray-200 px-3 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-50">
                  <Printer className="w-3 h-3" /> Print
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["ID", "Name / Property", "Sub-type", "Transaction", "Score", "Owner", "Status", "Availability", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400 sticky top-0 z-10 bg-gray-50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProjects.map((p) => {
                    const txKey = p.subcategory.name.includes("Sale") || p.subcategory.name.includes("Sell") ? "Sale" : p.subcategory.name.includes("Tenant") ? "Tenant" : p.subcategory.name.includes("Rent") ? "Rent" : p.subcategory.name.includes("Buy") ? "Buy" : "Joint Venture";
                    const tx = TX_COLORS[txKey] ?? TX_COLORS["Sale"];
                    const avail = AVAIL_COLORS[p.state] ?? AVAIL_COLORS["OPEN"];
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md flex-shrink-0 bg-gray-100 flex items-center justify-center border border-gray-200">
                              <span className="text-gray-300 text-[10px] font-bold">{p.category.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <span className="font-mono text-[10px] text-gray-400">{p.projectNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors block">{p.title}</Link>
                          <p className="text-[10px] text-gray-400 mt-0.5">{p.category.name}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{subtypeLabel(p.subcategory.name)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: tx.bg, color: tx.color }}>
                            {txKey === "Sale" ? "FOR SALE" : txKey === "Rent" ? "FOR RENT" : txKey === "Buy" ? "TO BUY" : txKey === "Tenant" ? "TO RENT" : "JV"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const score = p.potentialScore ?? 0;
                            const label = score >= 60 ? "High" : score >= 20 ? "Medium" : score > 0 ? "Low" : null;
                            const color = score >= 60 ? { text: "#15803d", bg: "#dcfce7" } : score >= 20 ? { text: "#a16207", bg: "#fef9c3" } : { text: "#b91c1c", bg: "#fee2e2" };
                            return label ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: color.bg, color: color.text }}>
                                {label} · {score}pts
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.clientName ?? "—"}</td>
                        <td className="px-4 py-3">
                          {p.status ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                              style={{ borderColor: p.status.color, color: p.status.color, background: p.status.color + "12" }}>
                              {p.status.name}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: avail.bg, color: avail.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: avail.color }} />
                            {p.state === "OPEN" ? "Available" : p.state === "LOCKED" ? "Reserved" : "Closed"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => duplicateProject(e, p.id)} disabled={duplicatingId === p.id}
                              title="Duplicate this property" className="text-gray-300 hover:text-blue-600 disabled:opacity-50">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => deleteProject(e, p.id, p.title)} disabled={deletingId === p.id}
                              title="Delete this property" className="text-gray-300 hover:text-red-600 disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      No properties yet.{" "}
                      <Link href="/projects/new" className="text-blue-600 font-medium hover:underline">Add your first property</Link>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="mt-3 text-xs text-gray-400 text-right">
                {total} {total === 1 ? "property" : "properties"} total
              </div>
            )}
          </>
        )}

        {/* ── BUYER REQUIREMENTS ───────────────────────────── */}
        {activeTab === "Buyer Requirements" && (
          <RequirementCardList
            label="Buyer Requirements"
            icon={<Users className="w-3.5 h-3.5 text-green-600" />}
            items={filteredBuyerReqs}
            newHref="/projects/new"
            accent="green"
            onDelete={deleteProject}
            deletingId={deletingId}
          />
        )}

        {/* ── TENANT REQUIREMENTS ──────────────────────────── */}
        {activeTab === "Tenant Requirements" && (
          <RequirementCardList
            label="Tenant Requirements"
            icon={<Building2 className="w-3.5 h-3.5 text-amber-600" />}
            items={filteredTenantReqs}
            newHref="/projects/new"
            accent="amber"
            onDelete={deleteProject}
            deletingId={deletingId}
          />
        )}

        {/* ── MATCHING ─────────────────────────────────────── */}
        {activeTab === "Matching" && (
          <MatchingPanel matches={filteredMatches} buyerReqs={filteredBuyerReqs} tenantReqs={filteredTenantReqs} />
        )}

        {/* ── PROPOSALS ────────────────────────────────────── */}
        {activeTab === "Proposals" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-bold text-gray-900">Proposals</span>
                <span className="text-xs text-gray-400">({filteredProposals.length})</span>
              </div>
              <Link href="/proposals/new"
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                <Plus className="w-3.5 h-3.5" /> New Proposal
              </Link>
            </div>
            {filteredProposals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No proposals yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Run matching → select properties → create proposal in one flow.
                </p>
                <Link href="/proposals/new" className="inline-block mt-3 text-xs text-blue-600 font-bold hover:underline">Create your first proposal →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Pipeline summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {(["DRAFT","SENT","VIEWED","ACCEPTED","REJECTED"] as const).map(s => {
                    const count = filteredProposals.filter(p => p.status === s).length;
                    const cfg: Record<string, { color: string; bg: string }> = {
                      DRAFT:    { color: "#6b7280", bg: "#f9fafb" },
                      SENT:     { color: "#2563eb", bg: "#eff6ff" },
                      VIEWED:   { color: "#d97706", bg: "#fffbeb" },
                      ACCEPTED: { color: "#059669", bg: "#ecfdf5" },
                      REJECTED: { color: "#dc2626", bg: "#fff1f2" },
                    };
                    return (
                      <div key={s} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
                        <p className="text-xl font-bold" style={{ color: cfg[s].color }}>{count}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{s.toLowerCase()}</p>
                      </div>
                    );
                  })}
                </div>
                {/* Proposal cards */}
                {filteredProposals.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SITE VISITS ──────────────────────────────────── */}
        {activeTab === "Site Visits" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-bold text-gray-900">Site Visits</span>
                <span className="text-xs text-gray-400">({filteredSiteVisits.length})</span>
              </div>
              <Link href="/site-visits/new"
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                <Plus className="w-3.5 h-3.5" /> Schedule Visit
              </Link>
            </div>
            {filteredSiteVisits.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No site visits scheduled</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  After creating a Proposal, schedule a site visit so the buyer/tenant can see the property in person.
                </p>
                <Link href="/site-visits/new" className="inline-block mt-3 text-xs text-blue-600 font-bold hover:underline">
                  Schedule a Visit →
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Property", "Contact", "Segment", "Scheduled", "Notes", "Status"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400 sticky top-0 z-10 bg-gray-50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSiteVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{v.project?.title ?? <span className="text-gray-300 font-normal">—</span>}</td>
                        <td className="px-4 py-3 text-gray-700">{v.contact?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{v.segment ? SEGMENT_LABELS[v.segment] : "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(v.scheduledAt)}</td>
                        <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{v.notes ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", VISIT_STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-500")}>{v.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CLOSED DEALS ─────────────────────────────────── */}
        {activeTab === "Closed Deals" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-gray-900">Closed Deals</span>
              <span className="text-xs text-gray-400">({filteredDeals.length})</span>
            </div>
            {filteredDeals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No closed deals yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Close a deal from the Property page → Closure tab once both parties agree on final price.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Property", "Category", "Contact", "Type", "Agreed Price", "Closed On"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400 sticky top-0 z-10 bg-gray-50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDeals.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{d.project.title}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: SECTOR_COLORS[d.project.category.name]?.bg ?? "#f1f5f9", color: SECTOR_COLORS[d.project.category.name]?.color ?? "#64748b" }}>
                            {d.project.category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{d.contact.name}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", DEAL_TYPE_COLORS[d.type] ?? "bg-gray-100 text-gray-500")}>{dealTypeLabel(d.type)}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {d.finalPrice ? `₹${(d.finalPrice / 1e7).toFixed(2)}Cr` : d.finalRent ? `₹${d.finalRent.toLocaleString()}/mo` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{fmtDate(d.closureDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Matching Panel ───────────────────────────────────────────────────────────
function MatchingPanel({ matches, buyerReqs, tenantReqs }: {
  matches: Match[]; buyerReqs: BuyerReq[]; tenantReqs: TenantReq[];
}) {
  const confirmedMatches = matches.filter(m => m.confirmedAt);

  // Group confirmed matches by demand project
  type GroupedMatch = { reqId: string; reqNumber: string; contactName: string; type: "buyer" | "tenant"; matches: Match[] };
  const grouped: GroupedMatch[] = [];
  const buyerReqMap = Object.fromEntries(buyerReqs.map(r => [r.id, r]));
  const tenantReqMap = Object.fromEntries(tenantReqs.map(r => [r.id, r]));
  const seenReqs = new Set<string>();

  for (const m of confirmedMatches) {
    const reqId = m.demandProjectId ?? "";
    if (!reqId || seenReqs.has(reqId)) continue;
    seenReqs.add(reqId);
    const isBuyer = !!buyerReqMap[reqId];
    const req = isBuyer ? buyerReqMap[reqId] : tenantReqMap[reqId];
    if (!req) continue;
    grouped.push({
      reqId,
      reqNumber: req.projectNumber,
      contactName: req.clientContact?.name ?? "Unknown",
      type: isBuyer ? "buyer" : "tenant",
      matches: confirmedMatches
        .filter(mx => mx.demandProjectId === reqId)
        .sort((a, b) => b.matchPct - a.matchPct),
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-gray-900">Confirmed Matches</span>
          <span className="text-xs text-gray-400">({confirmedMatches.length} matches, {grouped.length} requirements)</span>
        </div>
      </div>

      {/* Guide banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-xs text-blue-700 leading-relaxed">
        <strong>How matching works:</strong> Open a property → <em>Find Buyers/Tenants</em> tab to manually tick requirements and save matches.
        Or open a buyer/tenant requirement → <em>Find Properties</em> tab. Auto-scan gives score suggestions.
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No confirmed matches yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4 max-w-xs mx-auto">
            Open a property and go to the "Find Buyers/Tenants" tab to manually match it with requirements.
          </p>
          <div className="flex items-center justify-center gap-3">
            {buyerReqs.length > 0 && (
              <Link href={`/projects/${buyerReqs[0].id}`}
                className="text-xs font-bold text-blue-600 hover:underline">
                Open Buyer Req →
              </Link>
            )}
            {tenantReqs.length > 0 && (
              <Link href={`/projects/${tenantReqs[0].id}`}
                className="text-xs font-bold text-amber-600 hover:underline">
                Open Tenant Req →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(g => (
            <div key={g.reqId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Requirement header */}
              <div className={cn("px-4 py-3 flex items-center justify-between gap-2 flex-wrap border-b border-gray-100",
                g.type === "buyer" ? "bg-green-50" : "bg-amber-50")}>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                    g.type === "buyer" ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800")}>
                    {g.type === "buyer" ? "BUYER" : "TENANT"}
                  </span>
                  <Link href={`/projects/${g.reqId}`}
                    className="font-bold text-gray-900 text-sm hover:text-blue-600 truncate">
                    {g.contactName}
                  </Link>
                  <span className="text-xs text-gray-400 flex-shrink-0">{g.reqNumber}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/projects/${g.reqId}?tab=Project Overview`}
                    className="text-[10px] font-bold border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-50">
                    View Requirement
                  </Link>
                </div>
              </div>
              {/* Match rows */}
              <div className="divide-y divide-gray-50">
                {g.matches.map(m => {
                  const color = MATCH_COLORS(m.matchPct);
                  const matched = Array.isArray(m.criteriaMatched) ? m.criteriaMatched as string[] : [];
                  const missed = Array.isArray(m.criteriaMissed) ? m.criteriaMissed as string[] : [];
                  return (
                    <div key={m.id} className="px-4 py-3 flex items-center gap-4">
                      {/* Match % ring */}
                      {m.matchPct > 0 ? (
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <svg width="40" height="40" className="-rotate-90">
                            <circle cx="20" cy="20" r="16" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                            <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3"
                              strokeDasharray={`${(m.matchPct / 100) * 100.5} 100.5`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>{m.matchPct}%</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">M</span>
                        </div>
                      )}
                      {/* Property info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/projects/${m.project.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block">
                          {m.project.title}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {m.isManual && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Manual</span>
                          )}
                          {matched.map(c => (
                            <span key={c} className="inline-flex items-center gap-0.5 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                              ✓ {c}
                            </span>
                          ))}
                          {missed.map(c => (
                            <span key={c} className="inline-flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                              ✗ {c}
                            </span>
                          ))}
                        </div>
                      </div>
                      {m.alreadySent && (
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">Sent</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Proposal Card ────────────────────────────────────────────────────────────
const PROPOSAL_STATUS_FLOW = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED"] as const;
type ProposalStatus = typeof PROPOSAL_STATUS_FLOW[number];

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [status, setStatus] = useState(proposal.status as ProposalStatus);
  const [updating, setUpdating] = useState(false);

  async function updateStatus(next: ProposalStatus) {
    setUpdating(true);
    await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, ...(next === "SENT" ? { sentAt: new Date().toISOString() } : {}) }),
    });
    setStatus(next);
    setUpdating(false);
  }

  const STATUS_CFG: Record<ProposalStatus, { color: string; bg: string; border: string }> = {
    DRAFT:    { color: "#6b7280", bg: "#f9fafb",  border: "#e5e7eb" },
    SENT:     { color: "#2563eb", bg: "#eff6ff",  border: "#bfdbfe" },
    VIEWED:   { color: "#d97706", bg: "#fffbeb",  border: "#fde68a" },
    ACCEPTED: { color: "#059669", bg: "#ecfdf5",  border: "#a7f3d0" },
    REJECTED: { color: "#dc2626", bg: "#fff1f2",  border: "#fecaca" },
  };
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.DRAFT;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">{proposal.proposalNumber}</span>
          <span className="font-bold text-gray-900 text-sm truncate">{proposal.contact.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{proposal.items.length} {proposal.items.length === 1 ? "property" : "properties"}</span>
        </div>
        {/* Status badge */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
          style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
          {status}
        </span>
      </div>

      {/* Properties in proposal */}
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
        {proposal.items.map((item) => (
          <Link key={item.project.id} href={`/projects/${item.project.id}`}
            className="text-[10px] text-blue-600 hover:underline font-medium">
            {item.project.title}
          </Link>
        ))}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-wrap">
        {status === "DRAFT" && (
          <button onClick={() => updateStatus("SENT")} disabled={updating}
            className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Send className="w-3 h-3" /> Mark as Sent
          </button>
        )}
        {status === "SENT" && (
          <button onClick={() => updateStatus("VIEWED")} disabled={updating}
            className="flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50">
            <Eye className="w-3 h-3" /> Mark as Viewed
          </button>
        )}
        {status === "VIEWED" && (
          <>
            <button onClick={() => updateStatus("ACCEPTED")} disabled={updating}
              className="flex items-center gap-1 text-[10px] font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <ThumbsUp className="w-3 h-3" /> Accepted
            </button>
            <button onClick={() => updateStatus("REJECTED")} disabled={updating}
              className="flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50">
              <ThumbsDown className="w-3 h-3" /> Rejected
            </button>
          </>
        )}
        {status === "REJECTED" && (
          <span className="text-[10px] text-gray-400">Revise and create a new proposal for this contact.</span>
        )}
        <span className="ml-auto text-[10px] text-gray-400">{fmtDate(proposal.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Shared Requirements Card List (mirrors /requirements/buyer and /requirements/tenant) ─────
const REQ_ACCENT = {
  green: { avatarBg: "bg-green-100", avatarText: "text-green-700", chipBg: "bg-green-50", chipText: "text-green-700", hoverBorder: "hover:border-green-300", hoverBg: "hover:bg-green-50/30", arrowHover: "group-hover:text-green-500", addBtn: "bg-green-600 hover:bg-green-700" },
  amber: { avatarBg: "bg-amber-100", avatarText: "text-amber-700", chipBg: "bg-amber-50", chipText: "text-amber-700", hoverBorder: "hover:border-amber-300", hoverBg: "hover:bg-amber-50/30", arrowHover: "group-hover:text-amber-500", addBtn: "bg-amber-600 hover:bg-amber-700" },
} as const;

function RequirementCardList({
  label, icon, items, newHref, accent, onDelete, deletingId,
}: {
  label: string; icon: React.ReactNode;
  items: (BuyerReq | TenantReq)[];
  newHref: string;
  accent: keyof typeof REQ_ACCENT;
  onDelete: (e: React.MouseEvent, id: string, label: string) => void;
  deletingId: string | null;
}) {
  const a = REQ_ACCENT[accent];
  const active = items.filter((p) => p.state !== "ARCHIVED");
  const inactive = items.filter((p) => p.state === "ARCHIVED");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold text-gray-900">{label}</span>
          <span className="text-xs text-gray-400">({items.length})</span>
        </div>
        <Link href={newHref}
          className={cn("flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-lg", a.addBtn)}>
          <Plus className="w-3.5 h-3.5" /> Add Requirement
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-gray-200 flex justify-center">{icon}</div>
          <p className="text-sm font-medium text-gray-500 mt-3">No {label.toLowerCase()} yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Add a requirement from a contact, then run Matching to find suitable properties.
          </p>
          <Link href={newHref} className={cn("inline-block mt-3 text-xs text-white font-bold px-4 py-2 rounded-lg", a.addBtn)}>
            Add Requirement →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section className="space-y-2">
              {inactive.length > 0 && <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active ({active.length})</p>}
              {active.map((r) => <RequirementCardRow key={r.id} r={r} a={a} onDelete={onDelete} deleting={deletingId === r.id} />)}
            </section>
          )}
          {inactive.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Archived ({inactive.length})</p>
              {inactive.map((r) => <RequirementCardRow key={r.id} r={r} a={a} onDelete={onDelete} deleting={deletingId === r.id} />)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RequirementCardRow({ r, a, onDelete, deleting }: {
  r: BuyerReq | TenantReq; a: typeof REQ_ACCENT[keyof typeof REQ_ACCENT];
  onDelete: (e: React.MouseEvent, id: string, label: string) => void;
  deleting: boolean;
}) {
  const displayName = r.clientContact?.name ?? r.clientName ?? r.title;
  return (
    <Link href={`/projects/${r.id}`}
      className={cn("flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3 transition-all group", a.hoverBorder, a.hoverBg)}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold", a.avatarBg, a.avatarText)}>
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">{displayName}</span>
          <span className="font-mono text-[10px] text-gray-400">{r.projectNumber}</span>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", a.chipBg, a.chipText)}>{r.category.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[10px] text-gray-400">{fmtDate(r.createdAt)}</span>
          {r.demandMatches.length > 0 && (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
              {r.demandMatches.length} matched
            </span>
          )}
        </div>
      </div>
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", REQ_STATUS_COLORS[r.state] ?? "bg-gray-100 text-gray-500")}>
        {r.state}
      </span>
      <button onClick={(e) => onDelete(e, r.id, displayName)} disabled={deleting}
        title="Delete this requirement" className="text-gray-300 hover:text-red-600 disabled:opacity-50 flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <ArrowRight className={cn("w-3.5 h-3.5 text-gray-300 flex-shrink-0 transition-colors", a.arrowHover)} />
    </Link>
  );
}
