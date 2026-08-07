"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, Building2, MapPin,
  Loader2, Check, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CustomFieldsSection from "@/components/CustomFieldsSection";
import FindPropertiesPanel from "@/components/requirement/FindPropertiesPanel";

type Category = { id: string; name: string };
type Contact = { id: string; name: string; phone: string | null; email: string | null };
type MatchedProject = {
  id: string; projectNumber: string; title: string;
  status: { name: string; color: string } | null;
};
type Match = {
  id: string; confirmedAt: string | null; matchPct: number;
  project: MatchedProject;
};

type BuyerReq = {
  id: string; reqNumber: string; status: string;
  budgetMin: number | null; budgetMax: number | null;
  areaMin: number | null; areaMax: number | null;
  bhk: string | null; furnishing: string | null;
  preferredLocations: unknown;
  notes: string | null;
  contact: Contact;
  category: Category;
  customFields: { id: string; label: string; value: string | null }[];
  matches: Match[];
};

type TenantReq = {
  id: string; reqNumber: string; status: string;
  rentMin: number | null; rentMax: number | null;
  areaMin: number | null; areaMax: number | null;
  notes: string | null;
  contact: Contact;
  category: Category;
  customFields: { id: string; label: string; value: string | null }[];
  matches: Match[];
};

type ReqData = BuyerReq | TenantReq;

function isBuyer(r: ReqData, type: string): r is BuyerReq {
  return type === "buyer";
}

const STATUS_COLORS: Record<string, string> = {
  NEW:     "bg-blue-50 text-blue-700",
  ACTIVE:  "bg-green-50 text-green-700",
  CLOSED:  "bg-gray-100 text-gray-500",
  ON_HOLD: "bg-amber-50 text-amber-700",
};

const ALL_STATUSES = ["NEW", "ACTIVE", "ON_HOLD", "CLOSED"] as const;

const TABS = ["Overview", "Find Properties", "Matched Properties"];

export default function RequirementDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<ReqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/requirements/${type}/${id}`);
    if (res.ok) setReq(await res.json());
    setLoading(false);
  }

  async function changeStatus(status: string) {
    if (!req) return;
    setStatusSaving(true);
    setStatusDropdown(false);
    await fetch(`/api/requirements/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setStatusSaving(false);
  }

  useEffect(() => { load(); }, [type, id]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );
  if (!req) return <div className="p-8 text-red-500 text-sm">Requirement not found.</div>;

  const isBuyerReq = isBuyer(req, type);
  const accentColor = isBuyerReq ? "#2563eb" : "#d97706";
  const Icon = isBuyerReq ? Users : Building2;
  const locations = Array.isArray((req as BuyerReq).preferredLocations)
    ? (req as BuyerReq).preferredLocations as string[]
    : [];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 h-12 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
        <h1 className="text-sm font-bold text-gray-900 truncate">{req.contact.name}</h1>
        <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{req.reqNumber}</span>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setStatusDropdown(v => !v)}
            disabled={statusSaving}
            className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity", STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-500")}>
            {req.status.replace(/_/g, " ")}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {statusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[130px]">
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_COLORS[s])}>{s.replace(/_/g, " ")}</span>
                    {req.status === s && <Check className="w-3 h-3 text-green-500 ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{ background: accentColor + "18", color: accentColor }}>
          {req.category.name}
        </span>
        <div className="flex-1" />
        <Link href={`/contacts/${req.contact.id}`}
          className="text-[10px] text-blue-600 font-bold hover:underline">
          View Contact →
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center h-9">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-3 h-full text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab ? "border-b-2" : "border-transparent text-gray-500 hover:text-gray-800")}
            style={activeTab === tab ? { borderColor: accentColor, color: accentColor } : undefined}>
            {tab}
            {tab === "Matched Properties" && req.matches.length > 0 && (
              <span className="ml-1 bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {req.matches.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── OVERVIEW ── */}
        {activeTab === "Overview" && (
          <>
            {/* Contact card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contact</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{ background: accentColor }}>
                  {req.contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{req.contact.name}</p>
                  {req.contact.phone && <p className="text-xs text-gray-500 mt-0.5">{req.contact.phone}</p>}
                  {req.contact.email && <p className="text-xs text-gray-500">{req.contact.email}</p>}
                </div>
              </div>
            </div>

            {/* Requirements summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Requirements</p>
              <div className="grid grid-cols-2 gap-4">
                {isBuyerReq ? (
                  <>
                    {((req as BuyerReq).budgetMin || (req as BuyerReq).budgetMax) && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Budget</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {(req as BuyerReq).budgetMin && `₹${((req as BuyerReq).budgetMin! / 1e7).toFixed(1)}Cr`}
                          {(req as BuyerReq).budgetMin && (req as BuyerReq).budgetMax && " – "}
                          {(req as BuyerReq).budgetMax && `₹${((req as BuyerReq).budgetMax! / 1e7).toFixed(1)}Cr`}
                        </p>
                      </div>
                    )}
                    {(req as BuyerReq).bhk && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">BHK</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{(req as BuyerReq).bhk}</p>
                      </div>
                    )}
                    {(req as BuyerReq).furnishing && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Furnishing</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{(req as BuyerReq).furnishing}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {((req as TenantReq).rentMin || (req as TenantReq).rentMax) && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rent Budget</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {(req as TenantReq).rentMin && `₹${(req as TenantReq).rentMin!.toLocaleString()}`}
                          {(req as TenantReq).rentMin && (req as TenantReq).rentMax && " – "}
                          {(req as TenantReq).rentMax && `₹${(req as TenantReq).rentMax!.toLocaleString()}/mo`}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {(req.areaMin || req.areaMax) && (
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Area</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {req.areaMin}{req.areaMin && req.areaMax && " – "}{req.areaMax} sqft
                    </p>
                  </div>
                )}
              </div>

              {locations.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Preferred Locations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {locations.map(l => (
                      <span key={l} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        <MapPin className="w-3 h-3" />{l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {req.notes && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{req.notes}</p>
                </div>
              )}
            </div>

            {/* Custom fields */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <CustomFieldsSection
                apiBase={`/api/requirements/${type}/${id}/custom-fields`}
                readOnly={false}
              />
            </div>
          </>
        )}

        {/* ── FIND PROPERTIES ── */}
        {activeTab === "Find Properties" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <FindPropertiesPanel reqId={id} reqType={type as "buyer" | "tenant"} />
          </div>
        )}

        {/* ── MATCHED PROPERTIES ── */}
        {activeTab === "Matched Properties" && (
          <>
            {req.matches.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <Check className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No confirmed matches yet.</p>
                <button onClick={() => setActiveTab("Find Properties")}
                  className="mt-3 text-xs font-bold text-blue-600 hover:underline">
                  Go to Find Properties →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {req.matches.map(m => (
                  <Link key={m.id} href={`/projects/${m.project.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
                      <span className="font-mono text-[10px] text-gray-400">{m.project.projectNumber}</span>
                      <span className="font-bold text-gray-900 text-sm flex-1 truncate">{m.project.title}</span>
                      {m.project.status && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
                          style={{ color: m.project.status.color, borderColor: m.project.status.color, background: m.project.status.color + "12" }}>
                          {m.project.status.name}
                        </span>
                      )}
                      {m.matchPct > 0 && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                          m.matchPct >= 80 ? "bg-green-100 text-green-700" : m.matchPct >= 50 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>
                          {m.matchPct}%
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
