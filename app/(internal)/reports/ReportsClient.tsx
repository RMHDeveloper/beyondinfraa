"use client";

import { useMemo, useState } from "react";
import { BarChart2, Home, Briefcase, Factory, RefreshCw, Users, FileText, MapPin, TrendingUp, Download, Calendar } from "lucide-react";

type Deal = {
  id: string; dealNumber: string; type: string;
  finalPrice: number | null; finalRent: number | null; brokerage: number | null;
  closureDate: string | Date | null; createdAt: string | Date;
  contactName: string; projectTitle: string; category: string;
};

type ProjectRow = {
  id: string; title: string; category: string; status: string; createdAt: string | Date;
};

type Props = {
  data: {
    totalProjects: number;
    byCategoryNamed: { category: string; count: number }[];
    byStatusNamed: { status: string; color: string; count: number }[];
    totalContacts: number;
    totalBuyerReqs: number;
    totalTenantReqs: number;
    totalProposals: number;
    totalSiteVisits: number;
    totalDeals: number;
    siteVisitsByStatusNamed: { status: string; count: number }[];
    deals: Deal[];
    projects: ProjectRow[];
  };
};

const CAT_ICONS: Record<string, React.ElementType> = {
  Residential: Home, Commercial: Briefcase, Industrial: Factory,
  Redevelopment: RefreshCw, Land: MapPin, "Special Projects": RefreshCw,
};

const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  Residential:      { color: "#2563eb", bg: "#eff6ff" },
  Commercial:       { color: "#d97706", bg: "#fffbeb" },
  Industrial:       { color: "#7c3aed", bg: "#f5f3ff" },
  Redevelopment:    { color: "#0d9488", bg: "#f0fdfa" },
  Land:             { color: "#059669", bg: "#ecfdf5" },
  "Special Projects": { color: "#db2777", bg: "#fdf2f8" },
};

function inRange(date: string | Date, from: string, to: string) {
  const d = new Date(date).getTime();
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime() + 86400000) return false;
  return true;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsClient({ data }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredDeals = useMemo(
    () => data.deals.filter((d) => inRange(d.createdAt, from, to)),
    [data.deals, from, to]
  );
  const filteredProjects = useMemo(
    () => data.projects.filter((p) => inRange(p.createdAt, from, to)),
    [data.projects, from, to]
  );

  const totalBrokerage = filteredDeals.reduce((sum, d) => sum + (d.brokerage ?? 0), 0);
  const totalSaleValue = filteredDeals.reduce((sum, d) => sum + (d.finalPrice ?? 0), 0);

  const dealsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of filteredDeals) map.set(d.category, (map.get(d.category) ?? 0) + 1);
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [filteredDeals]);

  const hasDateFilter = !!(from || to);

  const summaryMetrics = [
    { label: "Total Properties", value: hasDateFilter ? filteredProjects.length : data.totalProjects, icon: Home, color: "#2563eb" },
    { label: "Contacts", value: data.totalContacts, icon: Users, color: "#059669" },
    { label: "Buyer Requirements", value: data.totalBuyerReqs, icon: FileText, color: "#d97706" },
    { label: "Tenant Requirements", value: data.totalTenantReqs, icon: FileText, color: "#7c3aed" },
    { label: "Proposals Sent", value: data.totalProposals, icon: FileText, color: "#0d9488" },
    { label: "Site Visits", value: data.totalSiteVisits, icon: MapPin, color: "#db2777" },
    { label: "Deals Closed", value: hasDateFilter ? filteredDeals.length : data.totalDeals, icon: TrendingUp, color: "#059669" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex-shrink-0">
        <p className="text-xs text-gray-400">ERP System › Reports</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">Reports & Analytics</h1>
      </div>

      <div className="px-3 sm:px-6 py-4 space-y-5">
        {/* Date range + export */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Date Range</span>
          </div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          {hasDateFilter && (
            <button onClick={() => { setFrom(""); setTo(""); }}
              className="text-xs font-medium text-gray-400 hover:text-gray-600">Clear</button>
          )}
          <span className="text-xs text-gray-400 ml-1">Filters Deals & Properties breakdowns below.</span>

          <div className="ml-auto flex gap-2">
            <button onClick={() => downloadCsv("deals.csv", filteredDeals)}
              className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Deals CSV
            </button>
            <button onClick={() => downloadCsv("properties.csv", filteredProjects)}
              className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Properties CSV
            </button>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryMetrics.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Deal value metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Total Sale Value (filtered)</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalSaleValue.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Total Brokerage (filtered)</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalBrokerage.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" /> Properties by Category
          </p>
          <div className="space-y-3">
            {data.byCategoryNamed.map(({ category, count }) => {
              const tc = CAT_COLORS[category] ?? { color: "#64748b", bg: "#f1f5f9" };
              const pct = data.totalProjects > 0 ? Math.round((count / data.totalProjects) * 100) : 0;
              const Icon = CAT_ICONS[category] ?? Home;
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: tc.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{category}</span>
                      <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: tc.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {data.byCategoryNamed.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No properties yet.</p>
            )}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-4">Properties by Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.byStatusNamed.map(({ status, color, count }) => (
              <div key={status} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{count}</p>
                  <p className="text-[10px] text-gray-400">{status}</p>
                </div>
              </div>
            ))}
            {data.byStatusNamed.length === 0 && (
              <p className="text-sm text-gray-400 col-span-3 text-center py-4">No status data yet.</p>
            )}
          </div>
        </div>

        {/* Deals by Category (date-filtered) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Deals Closed by Category {hasDateFilter && <span className="text-xs font-normal text-gray-400">(filtered)</span>}
          </p>
          <div className="space-y-3">
            {dealsByCategory.map(({ category, count }) => {
              const tc = CAT_COLORS[category] ?? { color: "#64748b", bg: "#f1f5f9" };
              const pct = filteredDeals.length > 0 ? Math.round((count / filteredDeals.length) * 100) : 0;
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{category}</span>
                      <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: tc.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {dealsByCategory.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No deals in this range.</p>
            )}
          </div>
        </div>

        {/* Site Visits by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-4">Site Visits by Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.siteVisitsByStatusNamed.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{count}</p>
                  <p className="text-[10px] text-gray-400">{status}</p>
                </div>
              </div>
            ))}
            {data.siteVisitsByStatusNamed.length === 0 && (
              <p className="text-sm text-gray-400 col-span-3 text-center py-4">No site visits yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
