"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home, Briefcase, Factory, RefreshCw, TrendingUp,
  AlertCircle, Clock, Activity, ArrowUpRight, CheckCircle2,
  XCircle, FileText, Users, Target, MapPin, Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardData = {
  totalProjects: number; openCount: number;
  byState: { state: string; count: number }[];
  byCategory: { category: string; count: number }[];
  recentProjects: {
    id: string; projectNumber: string; title: string;
    category: { name: string }; subcategory: { name: string };
    status: { name: string; color: string } | null;
    clientName?: string | null; createdAt?: string;
  }[];
  overdueFollowups: number;
  totalContacts: number;
  totalBuyerReqs: number; totalTenantReqs: number;
  totalMatches: number; totalProposals: number;
  totalSiteVisits: number; totalDeals: number; activeNegotiations: number;
  pipelineValue: number;
  catCounts: Record<string, number>;
  buyerByCatMap: Record<string, number>;
  tenantByCatMap: Record<string, number>;
  matchByCatMap: Record<string, number>;
  negByCatMap: Record<string, number>;
};

const SECTORS = [
  { key: "Residential",   icon: Home,      color: "#2563eb", bg: "#eff6ff", sub: "Apartments · Villas · Plots" },
  { key: "Commercial",    icon: Briefcase, color: "#d97706", bg: "#fffbeb", sub: "Offices · Retail · Warehouses" },
  { key: "Industrial",    icon: Factory,   color: "#7c3aed", bg: "#f5f3ff", sub: "Factories · Logistics · Land" },
  { key: "Redevelopment", icon: RefreshCw, color: "#0d9488", bg: "#f0fdfa", sub: "Owner Register · Developer Matching" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  const pipelineCr = (data.pipelineValue / 1e7).toFixed(1);

  return (
    <div className="overflow-y-auto h-full bg-gray-50">
      <div className="px-4 sm:px-8 pt-6 pb-2">
        <p className="text-xs text-gray-400">ERP System › Main Dashboard</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Operations Overview</h1>
      </div>

      <div className="px-4 sm:px-8 pb-8 space-y-5">
        {/* Overdue alert */}
        {data.overdueFollowups > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span><strong>{data.overdueFollowups}</strong> overdue follow-ups need attention.</span>
            <Link href="/tasks" className="ml-auto text-xs font-bold underline">View Tasks</Link>
          </div>
        )}

        {/* Top KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Properties",    value: data.totalProjects,       icon: Home,     color: "#2563eb" },
            { label: "Contacts",      value: data.totalContacts,       icon: Users,    color: "#059669" },
            { label: "Buyer Reqs",    value: data.totalBuyerReqs,      icon: FileText, color: "#0d9488" },
            { label: "Tenant Reqs",   value: data.totalTenantReqs,     icon: FileText, color: "#d97706" },
            { label: "Matches",       value: data.totalMatches,        icon: Target,   color: "#7c3aed" },
            { label: "Proposals",     value: data.totalProposals,      icon: FileText, color: "#db2777" },
            { label: "Site Visits",   value: data.totalSiteVisits,     icon: MapPin,   color: "#0891b2" },
            { label: "Deals Closed",  value: data.totalDeals,          icon: TrendingUp, color: "#059669" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5" style={{ background: color + "18" }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Sector cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {SECTORS.map(({ key, icon: Icon, color, bg, sub }) => {
            const propCount = data.catCounts[key] ?? 0;
            const buyerReqs = data.buyerByCatMap[key] ?? 0;
            const tenantReqs = data.tenantByCatMap[key] ?? 0;
            const matches    = data.matchByCatMap[key] ?? 0;
            const negs       = data.negByCatMap[key] ?? 0;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                      <Icon className="w-4.5 h-4.5" style={{ color }} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{key}</p>
                      <p className="text-[10px] text-gray-400">{sub}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>{propCount}</span>
                </div>
                <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  {[
                    { label: "BUYER REQS",   val: buyerReqs },
                    { label: "TENANT REQS",  val: tenantReqs },
                    { label: "MATCHES",      val: matches },
                    { label: "NEGOTIATIONS", val: negs },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <Link href={`/projects?cat=${key}`}
                    className="block w-full text-center text-xs font-bold py-2 rounded-lg border-2 transition-colors hover:opacity-80"
                    style={{ borderColor: color, color }}>
                    OPEN {key.toUpperCase()}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline */}
        <div className="rounded-xl p-5 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8" style={{ background: "#1a2b3c" }}>
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-bold text-white">Pipeline Value</p>
            </div>
            <p className="text-4xl font-bold text-white">₹{pipelineCr} Cr</p>
            <p className="text-xs text-blue-300 mt-1">Sum of active buyer budgets</p>
            <Link href="/reports"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-5 rounded-lg transition-colors">
              View Full Report →
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SECTORS.map(({ key, color, bg }) => {
              const propCount = data.catCounts[key] ?? 0;
              return (
                <div key={key} className="rounded-lg px-4 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <span className="w-2 h-2 rounded-full inline-block mb-2" style={{ background: color }} />
                  <p className="text-lg font-bold text-white">{propCount}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{key}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority follow-ups + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Recent Properties</p>
              <Link href="/projects" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5">
                All Properties <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Property</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Category</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Added</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentProjects.map((p) => {
                  const stColors: Record<string, string> = { OPEN: "bg-green-50 text-green-700", LOCKED: "bg-amber-50 text-amber-700", ARCHIVED: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.id}`} className="font-semibold text-gray-800 hover:text-blue-600 block truncate max-w-[160px]">
                          {p.title}
                        </Link>
                        <p className="text-[10px] text-gray-400 font-mono">{p.projectNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {p.status ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: p.status.color + "20", color: p.status.color }}>
                            {p.status.name}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {data.recentProjects.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No properties yet</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Quick Actions
              </p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { label: "Add Property",        href: "/projects/new",               color: "#2563eb", bg: "#eff6ff",  icon: Home },
                { label: "Add Contact",          href: "/contacts/new",               color: "#059669", bg: "#ecfdf5",  icon: Users },
                { label: "Add Buyer Req",        href: "/requirements/buyer/new",     color: "#0d9488", bg: "#f0fdfa",  icon: FileText },
                { label: "Add Tenant Req",       href: "/requirements/tenant/new",    color: "#d97706", bg: "#fffbeb",  icon: FileText },
                { label: "Run Matching",         href: "/matching/run",               color: "#7c3aed", bg: "#f5f3ff",  icon: Target },
                { label: "New Proposal",         href: "/proposals/new",              color: "#db2777", bg: "#fdf2f8",  icon: FileText },
                { label: "Schedule Site Visit",  href: "/site-visits/new",            color: "#0891b2", bg: "#f0f9ff",  icon: MapPin },
                { label: "View Reports",         href: "/reports",                    color: "#64748b", bg: "#f1f5f9",  icon: TrendingUp },
              ].map(({ label, href, color, bg, icon: Icon }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
