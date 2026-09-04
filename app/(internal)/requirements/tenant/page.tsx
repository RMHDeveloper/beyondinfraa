import { db } from "@/lib/db";
import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATE_COLORS: Record<string, string> = {
  OPEN:     "bg-blue-50 text-blue-700",
  LOCKED:   "bg-amber-50 text-amber-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export default async function TenantRequirementsPage() {
  const projects = await db.project.findMany({
    where: { subcategory: { name: "Tenant" } },
    orderBy: { createdAt: "desc" },
    include: {
      clientContact: { select: { id: true, name: true } },
      category: { select: { name: true } },
      matches: { where: { confirmedAt: { not: null } }, select: { id: true } },
    },
    take: 200,
  });

  const active   = projects.filter(p => p.state !== "ARCHIVED");
  const inactive = projects.filter(p => p.state === "ARCHIVED");

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP › Requirements</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" /> Tenant Requirements
          </h1>
        </div>
        <Link href="/projects/new"
          className="flex items-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-700">
          <Plus className="w-3.5 h-3.5" /> Add Requirement
        </Link>
      </div>

      <div className="px-6 py-5 space-y-6">
        {projects.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No tenant requirements yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Create a Tenant project to start matching a tenant with rental properties.</p>
            <Link href="/projects/new"
              className="inline-flex items-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700">
              <Plus className="w-3.5 h-3.5" /> Add First Requirement
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-3">Active ({active.length})</p>
            <div className="space-y-2">
              {active.map(p => <ReqRow key={p.id} p={p} />)}
            </div>
          </section>
        )}

        {inactive.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Archived ({inactive.length})</p>
            <div className="space-y-2">
              {inactive.map(p => <ReqRow key={p.id} p={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ReqRow({ p }: {
  p: {
    id: string; projectNumber: string; title: string; state: string;
    clientContact: { id: string; name: string } | null;
    category: { name: string };
    matches: { id: string }[];
  }
}) {
  const contactName = p.clientContact?.name ?? p.title;
  return (
    <Link href={`/projects/${p.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-amber-300 hover:bg-amber-50/30 transition-all group">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-700">
        {contactName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">{contactName}</span>
          <span className="font-mono text-[10px] text-gray-400">{p.projectNumber}</span>
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{p.category.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {p.matches.length > 0 && (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
              {p.matches.length} matched
            </span>
          )}
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATE_COLORS[p.state] ?? "bg-gray-100 text-gray-500"}`}>
        {p.state}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
    </Link>
  );
}
