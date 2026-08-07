"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Phone, Mail, Building2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Contact = {
  id: string; name: string; phone: string | null; email: string | null;
  company: string | null; type: string; isActive: boolean; createdAt: Date | string;
};

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  OWNER:               { color: "#2563eb", bg: "#eff6ff" },
  BUYER:               { color: "#059669", bg: "#ecfdf5" },
  TENANT:              { color: "#d97706", bg: "#fffbeb" },
  DEVELOPER:           { color: "#7c3aed", bg: "#f5f3ff" },
  BROKER:              { color: "#0d9488", bg: "#f0fdfa" },
  COMPANY:             { color: "#64748b", bg: "#f1f5f9" },
  ASSOCIATION_MEMBER:  { color: "#db2777", bg: "#fdf2f8" },
  OTHER:               { color: "#64748b", bg: "#f1f5f9" },
};

const TYPE_LABELS: Record<string, string> = {
  OWNER: "Owner", BUYER: "Buyer", TENANT: "Tenant", DEVELOPER: "Developer",
  BROKER: "Broker", ARCHITECT: "Architect", LEGAL_CONSULTANT: "Legal",
  TECHNICAL_CONSULTANT: "Technical", ASSOCIATION_MEMBER: "Association", COMPANY: "Company", OTHER: "Other",
};

const FILTER_TYPES = ["All", "OWNER", "BUYER", "TENANT", "DEVELOPER", "BROKER", "COMPANY"];

export default function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = contacts.filter((c) => {
    const matchType = typeFilter === "All" || c.type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP System › Contacts</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Contact Database</h1>
        </div>
        <Link href="/contacts/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Contact
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-56" />
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_TYPES.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors",
                  typeFilter === t ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                {t === "All" ? "All" : TYPE_LABELS[t] ?? t}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} contacts</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Company</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const tc = TYPE_COLORS[c.type] ?? TYPE_COLORS.OTHER;
                const initials = c.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                          style={{ background: tc.bg, color: tc.color }}>
                          {initials}
                        </div>
                        <Link href={`/contacts/${c.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {c.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: tc.bg, color: tc.color }}>
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />{c.phone}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.email ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Mail className="w-3 h-3 text-gray-400" />{c.email}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.company ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Building2 className="w-3 h-3 text-gray-400" />{c.company}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                        c.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", c.isActive ? "bg-green-500" : "bg-gray-400")} />
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${c.id}/edit`}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-blue-600 px-2 py-1 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                        <Pencil className="w-3 h-3" /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No contacts yet.</p>
                    <Link href="/contacts/new" className="text-xs text-blue-600 font-medium hover:underline mt-1 inline-block">
                      Add your first contact
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
