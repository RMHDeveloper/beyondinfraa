import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowLeft, Phone, Mail, Building2, FileText, StickyNote, Plus, ArrowRight, Pencil } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  OWNER: "Owner", BUYER: "Buyer", TENANT: "Tenant", DEVELOPER: "Developer",
  BROKER: "Broker", ARCHITECT: "Architect", LEGAL_CONSULTANT: "Legal Consultant",
  TECHNICAL_CONSULTANT: "Technical Consultant", ASSOCIATION_MEMBER: "Association Member",
  COMPANY: "Company", OTHER: "Other",
};

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  OWNER:     { color: "#2563eb", bg: "#eff6ff" },
  BUYER:     { color: "#059669", bg: "#ecfdf5" },
  TENANT:    { color: "#d97706", bg: "#fffbeb" },
  DEVELOPER: { color: "#7c3aed", bg: "#f5f3ff" },
  BROKER:    { color: "#0d9488", bg: "#f0fdfa" },
  OTHER:     { color: "#64748b", bg: "#f1f5f9" },
};

const REQ_STATUS_COLORS: Record<string, string> = {
  NEW:     "bg-blue-50 text-blue-700",
  ACTIVE:  "bg-green-50 text-green-700",
  CLOSED:  "bg-gray-100 text-gray-500",
  ON_HOLD: "bg-amber-50 text-amber-700",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  SENT:     "bg-blue-50 text-blue-700",
  VIEWED:   "bg-purple-50 text-purple-700",
  DRAFT:    "bg-gray-100 text-gray-500",
};

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      buyerRequirements: {
        include: { category: true, matches: { where: { confirmedAt: { not: null } }, select: { id: true } } },
        orderBy: { createdAt: "desc" }, take: 20,
      },
      tenantRequirements: {
        include: { category: true, matches: { where: { confirmedAt: { not: null } }, select: { id: true } } },
        orderBy: { createdAt: "desc" }, take: 20,
      },
      proposals: {
        include: { items: { include: { project: { select: { id: true, title: true } } } } },
        orderBy: { createdAt: "desc" }, take: 10,
      },
      siteVisits: {
        include: { project: { select: { id: true, title: true } } },
        orderBy: { scheduledAt: "desc" }, take: 10,
      },
    },
  });
  if (!contact) notFound();

  const tc = TYPE_COLORS[contact.type] ?? TYPE_COLORS.OTHER;
  const initials = contact.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/contacts" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-gray-400">ERP › Contacts › {contact.name}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Contact Details</h1>
        </div>
        <Link href={`/contacts/${id}/edit`}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">
          <Pencil className="w-3 h-3" /> Edit
        </Link>
      </div>

      <div className="px-3 sm:px-6 py-5 space-y-4">
        {/* Identity card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: tc.bg, color: tc.color }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{contact.name}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                style={{ background: tc.bg, color: tc.color }}>
                {TYPE_LABELS[contact.type] ?? contact.type}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${contact.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${contact.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                {contact.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {contact.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{contact.phone}</span>}
              {contact.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" />{contact.email}</span>}
              {contact.company && <span className="flex items-center gap-1 text-xs text-gray-500"><Building2 className="w-3 h-3" />{contact.company}</span>}
            </div>
            {contact.notes && (
              <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-2">
                <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />{contact.notes}
              </p>
            )}
          </div>
        </div>

        {/* Buyer Requirements */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <FileText className="w-4 h-4 text-green-600" /> Buyer Requirements
              {contact.buyerRequirements.length > 0 && (
                <span className="text-[10px] text-gray-400">({contact.buyerRequirements.length})</span>
              )}
            </p>
            <Link href={`/requirements/buyer/new?contactId=${id}`}
              className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:text-green-900">
              <Plus className="w-3 h-3" /> Add
            </Link>
          </div>
          {contact.buyerRequirements.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No buyer requirements yet.</p>
          ) : (
            <div className="space-y-2">
              {contact.buyerRequirements.map((r) => (
                <Link key={r.id} href={`/requirements/buyer/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all group text-xs">
                  <span className="font-mono text-gray-400">{r.reqNumber}</span>
                  <span className="font-semibold text-gray-700">{r.category.name}</span>
                  {r.budgetMin && r.budgetMax && (
                    <span className="text-gray-500">₹{(r.budgetMin / 1e7).toFixed(1)}Cr – ₹{(r.budgetMax / 1e7).toFixed(1)}Cr</span>
                  )}
                  {r.matches.length > 0 && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                      {r.matches.length} matched
                    </span>
                  )}
                  <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${REQ_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {r.status}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tenant Requirements */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <FileText className="w-4 h-4 text-amber-600" /> Tenant Requirements
              {contact.tenantRequirements.length > 0 && (
                <span className="text-[10px] text-gray-400">({contact.tenantRequirements.length})</span>
              )}
            </p>
            <Link href={`/requirements/tenant/new?contactId=${id}`}
              className="flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900">
              <Plus className="w-3 h-3" /> Add
            </Link>
          </div>
          {contact.tenantRequirements.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No tenant requirements yet.</p>
          ) : (
            <div className="space-y-2">
              {contact.tenantRequirements.map((r) => (
                <Link key={r.id} href={`/requirements/tenant/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group text-xs">
                  <span className="font-mono text-gray-400">{r.reqNumber}</span>
                  <span className="font-semibold text-gray-700">{r.category.name}</span>
                  {r.rentMax && <span className="text-gray-500">Up to ₹{r.rentMax.toLocaleString()}/mo</span>}
                  {r.matches.length > 0 && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                      {r.matches.length} matched
                    </span>
                  )}
                  <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${REQ_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {r.status}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Proposals */}
        {contact.proposals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-bold text-gray-900 mb-3 flex items-center gap-1.5 text-sm">
              <FileText className="w-4 h-4 text-blue-600" /> Proposals ({contact.proposals.length})
            </p>
            <div className="space-y-2">
              {contact.proposals.map((p) => (
                <Link key={p.id} href={`/proposals/${p.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all text-xs group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-gray-400">{p.proposalNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PROPOSAL_STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {p.status}
                      </span>
                    </div>
                    {p.items.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.items.map(item => (
                          <span key={item.project.id} className="text-[10px] text-gray-500">
                            {item.project.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Site Visits */}
        {contact.siteVisits.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-bold text-gray-900 mb-3 flex items-center gap-1.5 text-sm">
              <FileText className="w-4 h-4 text-pink-600" /> Site Visits ({contact.siteVisits.length})
            </p>
            <div className="space-y-2">
              {contact.siteVisits.map((sv) => (
                <div key={sv.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 text-xs">
                  <span className="font-mono text-gray-400">{sv.visitNumber}</span>
                  {sv.project ? (
                    <Link href={`/projects/${sv.project.id}`} className="font-semibold text-gray-700 hover:text-blue-600 truncate min-w-0">
                      {sv.project.title}
                    </Link>
                  ) : (
                    <span className="text-gray-400 truncate min-w-0">No property linked</span>
                  )}
                  <span className="text-gray-400 ml-auto flex-shrink-0">
                    {new Date(sv.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${sv.status === "COMPLETED" ? "bg-green-50 text-green-700" : sv.status === "CANCELLED" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
                    {sv.status}
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
