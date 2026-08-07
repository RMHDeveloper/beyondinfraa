"use client";

import { BarChart2, Home, Briefcase, Factory, RefreshCw, Users, FileText, MapPin, TrendingUp } from "lucide-react";

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

export default function ReportsClient({ data }: Props) {
  const summaryMetrics = [
    { label: "Total Properties", value: data.totalProjects, icon: Home, color: "#2563eb" },
    { label: "Contacts", value: data.totalContacts, icon: Users, color: "#059669" },
    { label: "Buyer Requirements", value: data.totalBuyerReqs, icon: FileText, color: "#d97706" },
    { label: "Tenant Requirements", value: data.totalTenantReqs, icon: FileText, color: "#7c3aed" },
    { label: "Proposals Sent", value: data.totalProposals, icon: FileText, color: "#0d9488" },
    { label: "Site Visits", value: data.totalSiteVisits, icon: MapPin, color: "#db2777" },
    { label: "Deals Closed", value: data.totalDeals, icon: TrendingUp, color: "#059669" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <p className="text-xs text-gray-400">ERP System › Reports</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">Reports & Analytics</h1>
      </div>

      <div className="px-6 py-4 space-y-5">
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
      </div>
    </div>
  );
}
