"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Loader2, Check, ChevronDown,
  Building2, Users, Handshake, MapPin, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProposalItem = {
  id: string;
  sortOrder: number;
  response: string;
  remarks: string | null;
  project: {
    id: string; title: string; projectNumber: string;
    category: { name: string };
    subcategory: { name: string };
    status: { name: string; color: string } | null;
  };
};

type Proposal = {
  id: string;
  proposalNumber: string;
  status: string;
  introduction: string | null;
  remarks: string | null;
  createdAt: string;
  sentAt: string | null;
  contact: { id: string; name: string; phone: string | null; email: string | null };
  buyerRequirement: { reqNumber: string } | null;
  tenantRequirement: { reqNumber: string } | null;
  items: ProposalItem[];
  siteVisits: { id: string; visitNumber: string; scheduledAt: string; status: string; contact: { name: string } }[];
  negotiations: { id: string; status: string; contact: { name: string }; rounds: { id: string; offerAmount: number | null; offerBy: string }[] }[];
};

const PROPOSAL_STATUSES = [
  "DRAFT","SENT","VIEWED","RESPONSE_PENDING","INTERESTED",
  "SITE_VISIT_DONE","NEGOTIATING","ACCEPTED","REJECTED","EXPIRED",
];

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

const RESPONSE_COLORS: Record<string, string> = {
  NO_RESPONSE:           "bg-gray-100 text-gray-400",
  INTERESTED:            "bg-green-50 text-green-700",
  NOT_INTERESTED:        "bg-red-50 text-red-600",
  SHORTLISTED:           "bg-amber-50 text-amber-700",
  SITE_VISIT_REQUESTED:  "bg-blue-50 text-blue-700",
};

const SECTOR_COLORS: Record<string, string> = {
  Residential: "#2563eb", Commercial: "#d97706",
  Industrial: "#7c3aed", Redevelopment: "#0d9488", "Special Projects": "#0d9488",
};

const RESPONSE_OPTIONS = [
  "NO_RESPONSE","INTERESTED","NOT_INTERESTED","SHORTLISTED","SITE_VISIT_REQUESTED",
];

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [responseDropdown, setResponseDropdown] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/proposals/${id}`);
    if (res.ok) setProposal(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(status: string) {
    setStatusDropdown(false);
    setStatusSaving(true);
    await fetch(`/api/proposals/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setStatusSaving(false);
  }

  async function changeItemResponse(itemId: string, response: string) {
    setResponseDropdown(null);
    await fetch(`/api/proposal-items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );
  if (!proposal) return <div className="p-8 text-red-500 text-sm">Proposal not found.</div>;

  const reqNumber = proposal.buyerRequirement?.reqNumber ?? proposal.tenantRequirement?.reqNumber ?? null;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <FileText className="w-4 h-4 text-pink-600 flex-shrink-0" />
        <h1 className="text-sm font-bold text-gray-900">{proposal.proposalNumber}</h1>
        {reqNumber && (
          <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{reqNumber}</span>
        )}

        {/* Status dropdown */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setStatusDropdown(v => !v)} disabled={statusSaving}
            className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity",
              STATUS_COLORS[proposal.status] ?? "bg-gray-100 text-gray-500")}>
            {proposal.status.replace(/_/g, " ")}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {statusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
                {PROPOSAL_STATUSES.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_COLORS[s])}>{s.replace(/_/g, " ")}</span>
                    {proposal.status === s && <Check className="w-3 h-3 text-green-500 ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-1" />

        <Link href={`/contacts/${proposal.contact.id}`}
          className="text-[10px] text-pink-600 font-bold hover:underline flex-shrink-0">
          View Contact →
        </Link>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Contact + meta card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-600 flex-shrink-0 text-sm">
            {proposal.contact.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{proposal.contact.name}</p>
            {proposal.contact.phone && <p className="text-xs text-gray-500 mt-0.5">{proposal.contact.phone}</p>}
            {proposal.contact.email && <p className="text-xs text-gray-500">{proposal.contact.email}</p>}
          </div>
          <div className="text-right flex-shrink-0 space-y-1">
            <p className="text-[10px] text-gray-400">
              Created {new Date(proposal.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {proposal.sentAt && (
              <p className="text-[10px] text-blue-500">
                Sent {new Date(proposal.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Introduction / Remarks */}
        {(proposal.introduction || proposal.remarks) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {proposal.introduction && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Introduction</p>
                <p className="text-sm text-gray-700 leading-relaxed">{proposal.introduction}</p>
              </div>
            )}
            {proposal.remarks && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Remarks</p>
                <p className="text-sm text-gray-700 leading-relaxed">{proposal.remarks}</p>
              </div>
            )}
          </div>
        )}

        {/* Properties */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-900">Properties</span>
            <span className="text-xs text-gray-400">({proposal.items.length})</span>
          </div>
          {proposal.items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No properties in this proposal.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {proposal.items.map(item => {
                const color = SECTOR_COLORS[item.project.category.name] ?? "#64748b";
                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    {/* Sector dot */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />

                    {/* Property info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-gray-400">{item.project.projectNumber}</span>
                        {item.project.status && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                            style={{ color: item.project.status.color, borderColor: item.project.status.color, background: item.project.status.color + "12" }}>
                            {item.project.status.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{item.project.title}</p>
                      <p className="text-[10px] text-gray-400">{item.project.category.name} · {item.project.subcategory.name}</p>
                    </div>

                    {/* Client response dropdown */}
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setResponseDropdown(prev => prev === item.id ? null : item.id)}
                        className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border hover:opacity-80 transition-opacity",
                          RESPONSE_COLORS[item.response] ?? "bg-gray-100 text-gray-400")}>
                        {item.response.replace(/_/g, " ")}
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      {responseDropdown === item.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setResponseDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[170px]">
                            {RESPONSE_OPTIONS.map(r => (
                              <button key={r} onClick={() => changeItemResponse(item.id, r)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left">
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", RESPONSE_COLORS[r])}>{r.replace(/_/g, " ")}</span>
                                {item.response === r && <Check className="w-3 h-3 text-green-500 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Link to project */}
                    <Link href={`/projects/${item.project.id}`}
                      className="text-gray-300 hover:text-blue-500 transition-colors flex-shrink-0" title="Open project">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Site Visits */}
        {proposal.siteVisits.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-900">Site Visits</span>
              <span className="text-xs text-gray-400">({proposal.siteVisits.length})</span>
            </div>
            <div className="divide-y divide-gray-100">
              {proposal.siteVisits.map(v => (
                <div key={v.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{v.visitNumber}</span>
                  <span className="text-xs text-gray-700 flex-1">{v.contact.name}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(v.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{v.status.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Negotiations */}
        {proposal.negotiations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Handshake className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-900">Negotiations</span>
              <span className="text-xs text-gray-400">({proposal.negotiations.length})</span>
            </div>
            <div className="divide-y divide-gray-100">
              {proposal.negotiations.map(n => (
                <div key={n.id} className="px-4 py-3 flex items-center gap-3">
                  <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 flex-1">{n.contact.name}</span>
                  <span className="text-[10px] text-gray-400">{n.rounds.length} round{n.rounds.length !== 1 ? "s" : ""}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded",
                    n.status === "AGREED" ? "bg-green-100 text-green-700" : n.status === "ACTIVE" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500")}>
                    {n.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
