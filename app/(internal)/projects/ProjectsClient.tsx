"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, Printer,
  Building2, Users, FileText, MapPin, TrendingUp, Handshake,
  CheckCircle2, Target, Send, Eye, ThumbsUp, ThumbsDown, RefreshCw, Loader2,
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
  id: string; reqNumber: string; status: string;
  budgetMin: number | null; budgetMax: number | null;
  areaMin: number | null; areaMax: number | null; notes: string | null;
  contact: Contact; category: Category;
  createdAt: Date | string;
};
type TenantReq = {
  id: string; reqNumber: string; status: string;
  rentMin: number | null; rentMax: number | null;
  areaMin: number | null; areaMax: number | null; leaseDuration: number | null; notes: string | null;
  contact: Contact; category: Category;
  createdAt: Date | string;
};
type Match = {
  id: string; matchPct: number; alreadySent: boolean;
  isManual: boolean; confirmedAt: Date | string | null;
  criteriaMatched: unknown; criteriaMissed: unknown;
  project: { id: string; title: string; projectNumber: string };
  buyerRequirementId: string | null; tenantRequirementId: string | null;
};
type ProposalItem = { project: { id: string; title: string }; response: string };
type Proposal = {
  id: string; proposalNumber: string; status: string;
  contact: Contact; items: ProposalItem[];
  createdAt: Date | string;
};
type SiteVisit = {
  id: string; status: string; notes: string | null; scheduledAt: Date | string;
  contact: Contact; project: { id: string; title: string };
};
type NegRound = { id: string; offerAmount: number | null; offerBy: string; notes: string | null; createdAt: Date | string };
type Negotiation = {
  id: string; status: string; rounds: NegRound[];
  contact: Contact; project: { id: string; title: string };
  createdAt: Date | string;
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
  negotiations: Negotiation[];
  deals: Deal[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, { color: string; bg: string }> = {
  Residential:   { color: "#2563eb", bg: "#eff6ff" },
  Commercial:    { color: "#d97706", bg: "#fffbeb" },
  Industrial:    { color: "#7c3aed", bg: "#f5f3ff" },
  Redevelopment: { color: "#0d9488", bg: "#f0fdfa" },
};
const TX_COLORS: Record<string, { color: string; bg: string }> = {
  Sale:          { color: "#2563eb", bg: "#eff6ff" },
  Rent:          { color: "#d97706", bg: "#fffbeb" },
  Buy:           { color: "#0d9488", bg: "#f0fdfa" },
  "Joint Venture": { color: "#7c3aed", bg: "#f5f3ff" },
};
const AVAIL_COLORS: Record<string, { color: string; bg: string }> = {
  OPEN:     { color: "#059669", bg: "#ecfdf5" },
  LOCKED:   { color: "#d97706", bg: "#fffbeb" },
  ARCHIVED: { color: "#64748b", bg: "#f1f5f9" },
};
const REQ_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700", ACTIVE: "bg-green-50 text-green-700",
  ON_HOLD: "bg-amber-50 text-amber-700", CLOSED: "bg-gray-100 text-gray-500",
  CONVERTED: "bg-purple-50 text-purple-700",
};
const MATCH_COLORS = (pct: number) => pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626";
const VISIT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700", COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700", RESCHEDULED: "bg-amber-50 text-amber-700",
};
const NEG_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-50 text-blue-700", AGREED: "bg-green-50 text-green-700",
  STALLED: "bg-amber-50 text-amber-700", WITHDRAWN: "bg-red-50 text-red-700",
};
const DEAL_TYPE_COLORS: Record<string, string> = {
  SALE: "bg-blue-50 text-blue-700", RENT: "bg-amber-50 text-amber-700",
  LEASE: "bg-purple-50 text-purple-700", JV: "bg-teal-50 text-teal-700",
  REDEVELOPMENT: "bg-pink-50 text-pink-700",
};

const SUB_TABS = [
  "Overview", "Available Properties", "Buyer Requirements", "Tenant Requirements",
  "Matching", "Proposals", "Site Visits", "Negotiations", "Closed Deals",
] as const;
type SubTab = typeof SUB_TABS[number];

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectsClient({
  projects, buyerReqs, tenantReqs, contacts, categories,
  matches, proposals, siteVisits, negotiations, deals,
}: Props) {
  const router = useRouter();

  const sp = useSearchParams();

  const catParam = sp.get("cat") ?? "All";
  const tabParam = (sp.get("tab") as SubTab | null) ?? "Available Properties";

  const [activeTab, setActiveTab] = useState<SubTab>("Available Properties");
  const [txFilter, setTxFilter] = useState<"All" | "For Sale" | "For Rent">("All");
  const [reqCatFilter, setReqCatFilter] = useState("All");

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

  const catFiltered = catParam === "All" ? projects : projects.filter((p) => p.category.name === catParam);
  const filteredProjects = catFiltered.filter((p) => {
    if (txFilter === "For Sale") return p.subcategory.name.includes("Sale") || p.subcategory.name.includes("Buy");
    if (txFilter === "For Rent") return p.subcategory.name.includes("Rent");
    return true;
  });
  const total = filteredProjects.length;
  const sectorColor = catParam !== "All" ? (SECTOR_COLORS[catParam]?.color ?? "#2563eb") : "#2563eb";

  const filteredBuyerReqs = reqCatFilter === "All" ? buyerReqs : buyerReqs.filter((r) => r.category.name === reqCatFilter);
  const filteredTenantReqs = reqCatFilter === "All" ? tenantReqs : tenantReqs.filter((r) => r.category.name === reqCatFilter);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Category header bar */}
      {catParam !== "All" && (
        <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: SECTOR_COLORS[catParam]?.bg, color: SECTOR_COLORS[catParam]?.color }}>
            {catParam}
          </span>
          <span className="text-xs text-gray-400">Showing {catFiltered.length} records in this category</span>
          <Link href="/projects" className="ml-auto text-xs text-gray-400 hover:text-gray-700 underline">View All</Link>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-0 overflow-x-auto flex-shrink-0">
        {SUB_TABS.map((tab) => (
          <button key={tab} onClick={() => handleTabClick(tab)}
            className={cn("px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
              activeTab === tab ? "text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800")}
            style={activeTab === tab ? { borderColor: sectorColor, color: sectorColor } : undefined}>
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 py-2 flex-shrink-0">
          <Link href="/projects/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Property
          </Link>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-6 py-4">

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
                { label: "Buyer Requirements", value: buyerReqs.length, icon: Users, color: "#2563eb" },
                { label: "Tenant Requirements", value: tenantReqs.length, icon: Building2, color: "#d97706" },
                { label: "Proposals", value: proposals.length, icon: FileText, color: "#7c3aed" },
                { label: "Deals Closed", value: deals.length, icon: TrendingUp, color: "#059669" },
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
        {activeTab === "Available Properties" && (
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

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["ID", "Name / Property", "Sub-type", "Transaction", "Score", "Owner", "Status", "Availability"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProjects.map((p) => {
                    const txKey = p.subcategory.name.includes("Sale") ? "Sale" : p.subcategory.name.includes("Rent") ? "Rent" : p.subcategory.name.includes("Buy") ? "Buy" : "Joint Venture";
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
                        <td className="px-4 py-3 text-gray-600">{p.subcategory.name.split(" ")[0]}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: tx.bg, color: tx.color }}>
                            {txKey === "Sale" ? "FOR SALE" : txKey === "Rent" ? "FOR RENT" : txKey === "Buy" ? "TO BUY" : "JV"}
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
                      </tr>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
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
          <RequirementsTab
            label="Buyer Requirements"
            color="#059669"
            icon={<Users className="w-3.5 h-3.5 text-green-600" />}
            items={filteredBuyerReqs}
            categories={categories}
            catFilter={reqCatFilter}
            onCatFilter={setReqCatFilter}
            newHref="/requirements/buyer/new"
            renderRow={(r: BuyerReq) => (
              <>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{r.reqNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{r.contact.name}</p>
                  <p className="text-[10px] text-gray-400">{r.contact.type}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: SECTOR_COLORS[r.category.name]?.bg ?? "#f1f5f9", color: SECTOR_COLORS[r.category.name]?.color ?? "#64748b" }}>
                    {r.category.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.budgetMin && r.budgetMax ? `₹${(r.budgetMin / 1e7).toFixed(1)}Cr – ₹${(r.budgetMax / 1e7).toFixed(1)}Cr` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.areaMin && r.areaMax ? `${r.areaMin}–${r.areaMax} sq.ft` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", REQ_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500")}>{r.status}</span>
                </td>
              </>
            )}
            headers={["Req #", "Contact", "Category", "Budget", "Area", "Date", "Status"]}
          />
        )}

        {/* ── TENANT REQUIREMENTS ──────────────────────────── */}
        {activeTab === "Tenant Requirements" && (
          <RequirementsTab
            label="Tenant Requirements"
            color="#d97706"
            icon={<Building2 className="w-3.5 h-3.5 text-amber-600" />}
            items={filteredTenantReqs}
            categories={categories}
            catFilter={reqCatFilter}
            onCatFilter={setReqCatFilter}
            newHref="/requirements/tenant/new"
            renderRow={(r: TenantReq) => (
              <>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{r.reqNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{r.contact.name}</p>
                  <p className="text-[10px] text-gray-400">{r.contact.type}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: SECTOR_COLORS[r.category.name]?.bg ?? "#f1f5f9", color: SECTOR_COLORS[r.category.name]?.color ?? "#64748b" }}>
                    {r.category.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.rentMax ? `Up to ₹${r.rentMax.toLocaleString()}/mo` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.areaMin && r.areaMax ? `${r.areaMin}–${r.areaMax} sq.ft` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", REQ_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500")}>{r.status}</span>
                </td>
              </>
            )}
            headers={["Req #", "Contact", "Category", "Rent Budget", "Area", "Date", "Status"]}
          />
        )}

        {/* ── MATCHING ─────────────────────────────────────── */}
        {activeTab === "Matching" && (
          <MatchingPanel matches={matches} buyerReqs={buyerReqs} tenantReqs={tenantReqs} />
        )}

        {/* ── PROPOSALS ────────────────────────────────────── */}
        {activeTab === "Proposals" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-bold text-gray-900">Proposals</span>
                <span className="text-xs text-gray-400">({proposals.length})</span>
              </div>
              <Link href="/proposals/new"
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                <Plus className="w-3.5 h-3.5" /> New Proposal
              </Link>
            </div>
            {proposals.length === 0 ? (
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
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {(["DRAFT","SENT","VIEWED","ACCEPTED","REJECTED"] as const).map(s => {
                    const count = proposals.filter(p => p.status === s).length;
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
                {proposals.map((p) => (
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
                <span className="text-xs text-gray-400">({siteVisits.length})</span>
              </div>
              <Link href="/site-visits/new"
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                <Plus className="w-3.5 h-3.5" /> Schedule Visit
              </Link>
            </div>
            {siteVisits.length === 0 ? (
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
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Property", "Contact", "Scheduled", "Notes", "Status"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {siteVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{v.project.title}</td>
                        <td className="px-4 py-3 text-gray-700">{v.contact.name}</td>
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

        {/* ── NEGOTIATIONS ─────────────────────────────────── */}
        {activeTab === "Negotiations" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold text-gray-900">Negotiations</span>
                <span className="text-xs text-gray-400">({negotiations.length})</span>
              </div>
            </div>
            {negotiations.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Handshake className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No active negotiations</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Once a proposal is accepted, open the Property page → Negotiation Log tab to start tracking offer rounds.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {negotiations.map((n) => (
                  <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{n.project.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">with <span className="font-semibold">{n.contact.name}</span> · started {fmtDate(n.createdAt)}</p>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", NEG_STATUS_COLORS[n.status] ?? "bg-gray-100 text-gray-500")}>{n.status}</span>
                    </div>
                    {n.rounds.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Round History</p>
                        {n.rounds.map((r, i) => (
                          <div key={r.id} className="flex items-start gap-3 text-xs">
                            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                {r.offerAmount && <span className={cn("font-semibold", r.offerBy === "buyer" ? "text-blue-700" : "text-amber-700")}>{r.offerBy === "buyer" ? "Buyer offer" : "Seller offer"}: ₹{(r.offerAmount / 1e7).toFixed(2)}Cr</span>}
                                <span className="text-gray-400 ml-auto">{fmtDate(r.createdAt)}</span>
                              </div>
                              {r.notes && <p className="text-gray-400 mt-0.5">{r.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
              <span className="text-xs text-gray-400">({deals.length})</span>
            </div>
            {deals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No closed deals yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Close a deal from the Property page → Negotiation Log tab once both parties agree on final price.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Property", "Category", "Contact", "Type", "Agreed Price", "Closed On"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deals.map((d) => (
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
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", DEAL_TYPE_COLORS[d.type] ?? "bg-gray-100 text-gray-500")}>{d.type}</span>
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

  // Group confirmed matches by requirement
  type GroupedMatch = { reqId: string; reqNumber: string; contactName: string; type: "buyer" | "tenant"; matches: Match[] };
  const grouped: GroupedMatch[] = [];
  const buyerReqMap = Object.fromEntries(buyerReqs.map(r => [r.id, r]));
  const tenantReqMap = Object.fromEntries(tenantReqs.map(r => [r.id, r]));
  const seenReqs = new Set<string>();

  for (const m of confirmedMatches) {
    const reqId = m.buyerRequirementId ?? m.tenantRequirementId ?? "";
    if (!reqId || seenReqs.has(reqId)) continue;
    seenReqs.add(reqId);
    const isBuyer = !!m.buyerRequirementId;
    const req = isBuyer ? buyerReqMap[reqId] : tenantReqMap[reqId];
    if (!req) continue;
    grouped.push({
      reqId,
      reqNumber: req.reqNumber,
      contactName: req.contact.name,
      type: isBuyer ? "buyer" : "tenant",
      matches: confirmedMatches
        .filter(mx => (isBuyer ? mx.buyerRequirementId : mx.tenantRequirementId) === reqId)
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
              <Link href={`/requirements/buyer/${buyerReqs[0].id}`}
                className="text-xs font-bold text-blue-600 hover:underline">
                Open Buyer Req →
              </Link>
            )}
            {tenantReqs.length > 0 && (
              <Link href={`/requirements/tenant/${tenantReqs[0].id}`}
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
              <div className={cn("px-4 py-3 flex items-center justify-between border-b border-gray-100",
                g.type === "buyer" ? "bg-green-50" : "bg-amber-50")}>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                    g.type === "buyer" ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800")}>
                    {g.type === "buyer" ? "BUYER" : "TENANT"}
                  </span>
                  <Link href={`/requirements/${g.type}/${g.reqId}`}
                    className="font-bold text-gray-900 text-sm hover:text-blue-600">
                    {g.contactName}
                  </Link>
                  <span className="text-xs text-gray-400">{g.reqNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/requirements/${g.type}/${g.reqId}`}
                    className="text-[10px] font-bold border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-50">
                    View Req
                  </Link>
                  <Link href={`/proposals/new?${g.type === "buyer" ? "buyerReqId" : "tenantReqId"}=${g.reqId}`}
                    className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    <Send className="w-3 h-3" /> Create Proposal
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
        {status === "ACCEPTED" && proposal.items[0] && (
          <Link href={`/projects/${proposal.items[0].project.id}?tab=Negotiation+Log`}
            className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100">
            Open Negotiation Log →
          </Link>
        )}
        {status === "REJECTED" && (
          <span className="text-[10px] text-gray-400">Revise and create a new proposal for this contact.</span>
        )}
        <span className="ml-auto text-[10px] text-gray-400">{fmtDate(proposal.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Shared Requirements Tab ──────────────────────────────────────────────────
function RequirementsTab<T>({
  label, color, icon, items, categories, catFilter, onCatFilter,
  newHref, renderRow, headers,
}: {
  label: string; color: string; icon: React.ReactNode;
  items: T[]; categories: Category[];
  catFilter: string; onCatFilter: (c: string) => void;
  newHref: string;
  renderRow: (item: T) => React.ReactNode;
  headers: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold text-gray-900">{label}</span>
          <span className="text-xs text-gray-400">({items.length})</span>
        </div>
        <Link href={newHref}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Add Requirement
        </Link>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {["All", ...categories.map((c) => c.name)].map((cat) => (
          <button key={cat} onClick={() => onCatFilter(cat)}
            className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
              catFilter === cat
                ? "text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50")}
            style={catFilter === cat ? { background: color } : undefined}>
            {cat}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-gray-200 flex justify-center">{icon}</div>
          <p className="text-sm font-medium text-gray-500 mt-3">No {label.toLowerCase()} yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Add a requirement from a contact, then run Matching to find suitable properties.
          </p>
          <Link href={newHref} className="inline-block mt-3 text-xs bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700">
            Add Requirement →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {headers.map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {renderRow(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
