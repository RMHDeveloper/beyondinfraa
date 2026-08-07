"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Contact  = { id: string; name: string; type: string };
type ReqItem  = { id: string; reqNumber: string; contact: Contact; category: { name: string } };
type Project  = { id: string; title: string; projectNumber: string; category: { name: string } };

const SECTOR_COLORS: Record<string, { color: string; bg: string }> = {
  Residential: { color: "#2563eb", bg: "#eff6ff" },
  Commercial:  { color: "#d97706", bg: "#fffbeb" },
  Industrial:  { color: "#7c3aed", bg: "#f5f3ff" },
};

export default function NewProposalForm({
  contacts, buyerReqs, tenantReqs, projects, action,
}: {
  contacts: Contact[]; buyerReqs: ReqItem[]; tenantReqs: ReqItem[];
  projects: Project[]; action: (fd: FormData) => Promise<void>;
}) {
  const [reqType, setReqType] = useState<"buyer" | "tenant">("buyer");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  function toggleProject(id: string) {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  const reqs = reqType === "buyer" ? buyerReqs : tenantReqs;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/projects?tab=Proposals" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP System › Proposals › New</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Create Proposal</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <form action={action} className="max-w-3xl space-y-4">

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Proposal Details
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact *</label>
              <select name="contactId" required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Select contact…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
              </select>
            </div>

            {/* Requirement type toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Link to Requirement (optional)</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setReqType("buyer")}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                    reqType === "buyer" ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                  Buyer Req
                </button>
                <button type="button" onClick={() => setReqType("tenant")}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                    reqType === "tenant" ? "bg-amber-600 text-white border-amber-600" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                  Tenant Req
                </button>
              </div>
              {reqType === "buyer" ? (
                <select name="buyerRequirementId" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">None</option>
                  {reqs.map((r) => <option key={r.id} value={r.id}>{r.reqNumber} — {r.contact.name} ({r.category.name})</option>)}
                </select>
              ) : (
                <select name="tenantRequirementId" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">None</option>
                  {reqs.map((r) => <option key={r.id} value={r.id}>{r.reqNumber} — {r.contact.name} ({r.category.name})</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Introduction</label>
              <textarea name="introduction" rows={2}
                placeholder="Brief intro for the proposal document…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
              <textarea name="remarks" rows={2}
                placeholder="Any closing remarks or notes…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          {/* Property selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Select Properties * ({selectedProjects.length} selected)
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
              {projects.map((p) => {
                const selected = selectedProjects.includes(p.id);
                const tc = SECTOR_COLORS[p.category.name] ?? { color: "#64748b", bg: "#f1f5f9" };
                return (
                  <label key={p.id}
                    className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50")}>
                    <input type="checkbox" name="projectIds" value={p.id}
                      checked={selected}
                      onChange={() => toggleProject(p.id)}
                      className="sr-only" />
                    <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      selected ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-400">{p.projectNumber}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0"
                      style={{ background: tc.bg, color: tc.color }}>
                      {p.category.name}
                    </span>
                  </label>
                );
              })}
              {projects.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No available properties found.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Create Proposal
            </button>
            <Link href="/projects?tab=Proposals"
              className="text-sm font-semibold text-gray-500 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
